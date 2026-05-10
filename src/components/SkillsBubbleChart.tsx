import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';

interface SkillItem {
  name: string;
  level: string;
}

interface Subcategory {
  name: string;
  skills: SkillItem[];
}

interface Category {
  name: string;
  pillClass: string;
  subcategories?: Subcategory[];
  skills?: SkillItem[];
}

interface SkillData {
  id: string;
  name: string;
  value: number;
  category: string;
}

interface SkillsBubbleChartProps {
  data: SkillData[];
  categoriesData: Category[];
}

// Score mapping
const shadeScores: { [key: string]: number } = {
  shade1: 5,
  shade2: 4,
  shade3: 3,
  shade4: 2,
  shade5: 1,
};

// Category colors
const categoryColors: { [key: string]: string } = {
  'Backend Development': '#b06c13',
  'Frontend Development': '#b7a414',
  'Database': '#47a248',
  'Infrastructure & Deployment': '#2496ed',
  'CI/CD': '#2b5797',
  'Network': '#0052cc',
  'Cloud': '#671f74',
  'Tools': '#6e1431',
  'Security & Authentication': '#146e66',
  'AI': '#306998',
  'Mobile & App Development': '#00bcd4',
};

// Generate unique ID for clipPath
let clipIdCounter = 0;
const generateClipId = () => `clip-${++clipIdCounter}-${Date.now()}`;
const hasRenderableDimensions = ({ width, height }: { width: number; height: number }) =>
  Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;

export default function SkillsBubbleChart({ data, categoriesData }: SkillsBubbleChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        if (width > 0) {
          const size = Math.min(width, 600);
          setDimensions((current) => (
            current.width === size && current.height === size
              ? current
              : { width: size, height: size }
          ));
        }
      }
    };

    updateDimensions();
    
    // Use ResizeObserver for more reliable sizing
    const ro = new ResizeObserver(() => updateDimensions());
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }
    
    return () => ro.disconnect();
  }, []);

  // Handle back button
  const handleBack = useCallback(() => {
    setSelectedCategory(null);
  }, []);

  // Render Bubble Chart (main view)
  const renderBubbleChart = useCallback(() => {
    if (!svgRef.current || data.length === 0) return;

    try {
      const { width, height } = dimensions;
      if (!hasRenderableDimensions(dimensions)) return;
      const margin = 2;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const format = d3.format(',d');
    const color = (category: string) => categoryColors[category] || '#666';

    // Create pack layout
    const pack = d3.pack<{ children: SkillData[] }>()
      .size([width - margin * 2, height - margin * 2])
      .padding(3);

    // Compute hierarchy
    const root = pack(
      d3.hierarchy({ children: data } as { children: SkillData[] })
        .sum((d: any) => d.value || 0) as d3.HierarchyNode<{ children: SkillData[] }>
    );

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [-margin, -margin, width, height].join(' '))
      .attr('style', 'max-width: 100%; height: auto;')
      .attr('text-anchor', 'middle');

    // Create defs for clipPaths
    const defs = svg.append('defs');

    // Create nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(root.leaves())
      .join('g')
      .attr('class', 'bubble-node')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer');

    // Add clipPath for each bubble
    node.each(function(d: any) {
      const clipId = generateClipId();
      (d as any).clipId = clipId;
      
      defs.append('clipPath')
        .attr('id', clipId)
        .append('circle')
        .attr('r', d.r);
    });

    // Add title tooltip
    node.append('title')
      .text((d: any) => `${d.data.name}\nScore: ${format(d.value)}\nClick to see details`);

    // Add circles with dynamic sizing
    node.append('circle')
      .attr('class', 'bubble-circle')
      .attr('fill-opacity', 0.75)
      .attr('fill', (d: any) => color(d.data.category))
      .attr('r', (d: any) => d.r)
      .attr('stroke', 'rgba(255,255,255,0.3)')
      .attr('stroke-width', 1)
      .style('transition', 'all 0.3s ease');

    // Add text labels - ALWAYS show category and value
    node.each(function(d: any) {
      const g = d3.select(this);
      const radius = d.r;
      
      // Calculate font size based on radius - ensure text fits
      // For very small bubbles, use smaller font but still show text
      const baseFontSize = Math.max(6, Math.min(14, radius / 3));
      const valueFontSize = Math.max(5, baseFontSize * 0.8);
      
      // Get abbreviated category name for small bubbles
      const fullName = d.data.name;
      const words = fullName.split(/\s+/);
      
      // Determine how much text to show based on radius
      let displayName: string;
      if (radius < 20) {
        // Very small: show first 3 chars
        displayName = fullName.substring(0, 3);
      } else if (radius < 35) {
        // Small: show first word abbreviated
        displayName = words[0].substring(0, 6);
      } else if (radius < 50) {
        // Medium: show first word
        displayName = words[0];
      } else {
        // Large: show full name or first two words
        displayName = words.slice(0, 2).join(' ');
      }

      // Create text group with clipPath
      const textGroup = g.append('g')
        .attr('clip-path', `url(#${(d as any).clipId})`);

      const text = textGroup.append('text')
        .attr('class', 'bubble-text')
        .style('fill', '#fff')
        .style('font-family', 'sans-serif')
        .style('font-weight', '600')
        .style('pointer-events', 'none')
        .style('text-shadow', '0 1px 2px rgba(0,0,0,0.7)')
        .style('font-size', `${baseFontSize}px`);

      // Add category name
      text.append('tspan')
        .attr('x', 0)
        .attr('y', radius < 30 ? '0em' : '-0.3em')
        .text(displayName);

      // Add value - always show
      text.append('tspan')
        .attr('x', 0)
        .attr('y', radius < 30 ? '1em' : '0.9em')
        .attr('fill-opacity', 0.9)
        .style('font-size', `${valueFontSize}px`)
        .text(format(d.value));
    });

    // Hover effects with center translation
    node.on('mouseenter', function(event: MouseEvent, d: any) {
      const nodeGroup = d3.select(this);
      const circle = nodeGroup.select('.bubble-circle');
      
      // Get mouse position relative to the node center
      const [mx, my] = d3.pointer(event, this);
      
      // Calculate offset to move bubble center toward cursor (limited movement)
      const maxOffset = d.r * 0.15;
      const offsetX = Math.max(-maxOffset, Math.min(maxOffset, mx * 0.3));
      const offsetY = Math.max(-maxOffset, Math.min(maxOffset, my * 0.3));

      nodeGroup
        .raise()
        .transition()
        .duration(200)
        .attr('transform', `translate(${d.x + offsetX},${d.y + offsetY}) scale(1.15)`);

      circle
        .attr('fill-opacity', 1)
        .attr('stroke', 'rgba(255,255,255,0.9)')
        .attr('stroke-width', 3);
    })
    .on('mousemove', function(event: MouseEvent, d: any) {
      const [mx, my] = d3.pointer(event, this);
      const maxOffset = d.r * 0.15;
      const offsetX = Math.max(-maxOffset, Math.min(maxOffset, mx * 0.3));
      const offsetY = Math.max(-maxOffset, Math.min(maxOffset, my * 0.3));

      d3.select(this)
        .transition()
        .duration(100)
        .attr('transform', `translate(${d.x + offsetX},${d.y + offsetY}) scale(1.15)`);
    })
    .on('mouseleave', function(event: MouseEvent, d: any) {
      const nodeGroup = d3.select(this);
      const circle = nodeGroup.select('.bubble-circle');

      nodeGroup
        .transition()
        .duration(300)
        .attr('transform', `translate(${d.x},${d.y}) scale(1)`);

      circle
        .attr('fill-opacity', 0.75)
        .attr('stroke', 'rgba(255,255,255,0.3)')
        .attr('stroke-width', 1);
    })
    .on('click', function(event: MouseEvent, d: any) {
      event.stopPropagation();
      setSelectedCategory(d.data.name);
    });

    } catch (err) {
      console.error('[BubbleChart] D3 render error:', err);
    }
  }, [data, dimensions]);

  // Render Treemap (detail view)
  const renderTreemap = useCallback(() => {
    if (!svgRef.current || !selectedCategory) return;

    try {
      const { width, height } = dimensions;
      if (!hasRenderableDimensions(dimensions)) return;
      
      // Find the selected category data
      const category = categoriesData.find(c => c.name === selectedCategory);
      if (!category) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    // Build hierarchical data for treemap
    interface TreemapNode {
      name: string;
      children?: TreemapNode[];
      value?: number;
      level?: string;
    }

    const hierarchyData: TreemapNode = {
      name: category.name,
      children: category.subcategories 
        ? category.subcategories.map(sub => ({
            name: sub.name,
            children: sub.skills.map(skill => ({
              name: skill.name,
              value: shadeScores[skill.level] || 1,
              level: skill.level,
            }))
          }))
        : (category.skills || []).map(skill => ({
            name: skill.name,
            value: shadeScores[skill.level] || 1,
            level: skill.level,
          }))
    };

    const format = d3.format(',d');
    const baseColor = categoryColors[selectedCategory] || '#666';

    // Create color scale for subcategories
    const subcategoryNames = category.subcategories 
      ? category.subcategories.map(s => s.name)
      : [category.name];
    
    const colorScale = d3.scaleOrdinal<string>()
      .domain(subcategoryNames)
      .range(d3.schemeTableau10.map(c => {
        const blend = d3.interpolateRgb(c, baseColor);
        return blend(0.3);
      }));

    // Compute the treemap layout
    const root = d3.treemap<TreemapNode>()
      .tile(d3.treemapSquarify)
      .size([width, height])
      .padding(2)
      .round(true)(
        d3.hierarchy(hierarchyData)
          .sum(d => d.value || 0)
          .sort((a, b) => (b.value || 0) - (a.value || 0))
      );

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height].join(' '))
      .attr('style', 'max-width: 100%; height: auto;');

    // Create defs for clipPaths
    const defs = svg.append('defs');

    // Add cells for each leaf
    const leaf = svg.selectAll('g')
      .data(root.leaves())
      .join('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`)
      .style('cursor', 'pointer');

    // Create clipPath for each rect
    leaf.each(function(d: any, i: number) {
      const clipId = `treemap-clip-${i}-${Date.now()}`;
      (d as any).clipId = clipId;
      
      defs.append('clipPath')
        .attr('id', clipId)
        .append('rect')
        .attr('width', Math.max(0, d.x1 - d.x0))
        .attr('height', Math.max(0, d.y1 - d.y0))
        .attr('rx', 3)
        .attr('ry', 3);
    });

    // Add tooltip
    leaf.append('title')
      .text(d => {
        const ancestors = d.ancestors().reverse().map(d => d.data.name);
        const levelText = (d.data as any).level ? ` (Level: ${(d.data as any).level})` : '';
        return `${ancestors.join(' > ')}\nScore: ${format(d.value || 0)}${levelText}`;
      });

    // Add rectangles
    leaf.append('rect')
      .attr('class', 'treemap-rect')
      .attr('fill', d => {
        let parent = d.parent;
        while (parent && parent.depth > 1) {
          parent = parent.parent;
        }
        const subcatName = parent ? parent.data.name : d.data.name;
        return colorScale(subcatName);
      })
      .attr('fill-opacity', d => {
        const level = (d.data as any).level;
        const opacity = level ? (shadeScores[level] || 3) / 5 * 0.5 + 0.4 : 0.7;
        return opacity;
      })
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('rx', 3)
      .attr('ry', 3)
      .attr('stroke', 'rgba(255,255,255,0.2)')
      .attr('stroke-width', 1)
      .on('mouseenter', function() {
        d3.select(this)
          .attr('fill-opacity', 1)
          .attr('stroke', 'rgba(255,255,255,0.8)')
          .attr('stroke-width', 2);
      })
      .on('mouseleave', function(event, d) {
        const level = (d.data as any).level;
        const opacity = level ? (shadeScores[level] || 3) / 5 * 0.5 + 0.4 : 0.7;
        d3.select(this)
          .attr('fill-opacity', opacity)
          .attr('stroke', 'rgba(255,255,255,0.2)')
          .attr('stroke-width', 1);
      });

    // Add text labels - centered and auto-scaling
    leaf.each(function(d: any) {
      const g = d3.select(this);
      const rectWidth = d.x1 - d.x0;
      const rectHeight = d.y1 - d.y0;
      
      // Skip text for very small rectangles
      if (rectWidth < 20 || rectHeight < 15) return;

      // Padding from edges
      const padding = 4;
      const availableWidth = rectWidth - padding * 2;
      const availableHeight = rectHeight - padding * 2;

      // Get text content
      const name = d.data.name;
      const value = format(d.value || 0);
      
      // Split name into displayable parts
      const words = name.split(/(?=[A-Z][a-z])|\s+/g);
      
      // Function to calculate text width (approximate)
      const getTextWidth = (text: string, fontSize: number) => text.length * fontSize * 0.55;
      
      // Function to find optimal font size
      const findOptimalFontSize = (lines: string[], maxWidth: number, maxHeight: number): number => {
        let fontSize = 14; // Start with max font size
        const minFontSize = 6;
        
        while (fontSize >= minFontSize) {
          const lineHeight = fontSize * 1.2;
          const totalHeight = lines.length * lineHeight;
          
          // Check if all lines fit
          const allLinesFit = lines.every(line => getTextWidth(line, fontSize) <= maxWidth);
          const heightFits = totalHeight <= maxHeight;
          
          if (allLinesFit && heightFits) {
            return fontSize;
          }
          fontSize -= 0.5;
        }
        return minFontSize;
      };

      // Build lines for display
      const buildLines = (words: string[], maxWidth: number, fontSize: number): string[] => {
        const lines: string[] = [];
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          
          if (getTextWidth(testLine, fontSize) <= maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              lines.push(currentLine);
            }
            // If single word is too long, truncate it
            if (getTextWidth(word, fontSize) > maxWidth) {
              const maxChars = Math.floor(maxWidth / (fontSize * 0.55));
              currentLine = word.substring(0, Math.max(1, maxChars - 1)) + '…';
            } else {
              currentLine = word;
            }
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }
        return lines;
      };

      // Try different configurations to find best fit
      let displayLines: string[] = [];
      let optimalFontSize = 6;
      let showValue = false;

      // First try: name + value
      for (let tryFontSize = 12; tryFontSize >= 6; tryFontSize -= 1) {
        const testLines = buildLines(words, availableWidth, tryFontSize);
        const lineHeight = tryFontSize * 1.2;
        const totalLinesWithValue = testLines.length + 1;
        const totalHeight = totalLinesWithValue * lineHeight;
        
        if (totalHeight <= availableHeight) {
          const allFit = testLines.every(line => getTextWidth(line, tryFontSize) <= availableWidth);
          if (allFit && getTextWidth(value, tryFontSize * 0.85) <= availableWidth) {
            displayLines = testLines;
            optimalFontSize = tryFontSize;
            showValue = true;
            break;
          }
        }
      }

      // Second try: name only (if name + value didn't fit)
      if (displayLines.length === 0) {
        for (let tryFontSize = 12; tryFontSize >= 6; tryFontSize -= 1) {
          const testLines = buildLines(words, availableWidth, tryFontSize);
          const lineHeight = tryFontSize * 1.2;
          const totalHeight = testLines.length * lineHeight;
          
          if (totalHeight <= availableHeight) {
            const allFit = testLines.every(line => getTextWidth(line, tryFontSize) <= availableWidth);
            if (allFit) {
              displayLines = testLines;
              optimalFontSize = tryFontSize;
              showValue = false;
              break;
            }
          }
        }
      }

      // Last resort: just first few characters
      if (displayLines.length === 0) {
        const maxChars = Math.floor(availableWidth / (6 * 0.55));
        if (maxChars >= 2) {
          displayLines = [name.substring(0, maxChars - 1) + '…'];
          optimalFontSize = 6;
        }
      }

      if (displayLines.length === 0) return;

      // Create text group with clipPath
      const textGroup = g.append('g')
        .attr('clip-path', `url(#${d.clipId})`);

      // Calculate vertical centering
      const lineHeight = optimalFontSize * 1.2;
      const totalLines = showValue ? displayLines.length + 1 : displayLines.length;
      const totalTextHeight = totalLines * lineHeight;
      const startY = (rectHeight - totalTextHeight) / 2 + optimalFontSize * 0.8;

      // Create centered text
      const text = textGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('x', rectWidth / 2)
        .attr('y', startY)
        .style('font-size', `${optimalFontSize}px`)
        .style('font-family', 'sans-serif')
        .style('font-weight', '500')
        .style('fill', '#fff')
        .style('text-shadow', '0 1px 2px rgba(0,0,0,0.7)')
        .style('pointer-events', 'none');

      // Add name lines
      displayLines.forEach((line, i) => {
        text.append('tspan')
          .attr('x', rectWidth / 2)
          .attr('dy', i === 0 ? 0 : `${lineHeight}px`)
          .text(line);
      });

      // Add value if there's space
      if (showValue) {
        text.append('tspan')
          .attr('x', rectWidth / 2)
          .attr('dy', `${lineHeight}px`)
          .attr('fill-opacity', 0.8)
          .style('font-size', `${optimalFontSize * 0.85}px`)
          .text(value);
      }
    });

    } catch (err) {
      console.error('[Treemap] D3 render error:', err);
    }
  }, [selectedCategory, categoriesData, dimensions]);

  // Add astro:page-load listener to handle View Transitions navigation
  useEffect(() => {
    const handlePageLoad = () => {
      // Re-render because Astro may have morphed the DOM (empty SVG after swap)
      requestAnimationFrame(() => {
        if (selectedCategory) {
          renderTreemap();
        } else {
          renderBubbleChart();
        }
      });
    };
    document.addEventListener('astro:page-load', handlePageLoad);
    return () => document.removeEventListener('astro:page-load', handlePageLoad);
  }, [selectedCategory, renderBubbleChart, renderTreemap]);

  // Main effect to render chart
  useEffect(() => {
    if (selectedCategory) {
      renderTreemap();
    } else {
      renderBubbleChart();
    }
  }, [selectedCategory, renderBubbleChart, renderTreemap]);

  return (
    <div ref={containerRef} className="skills-bubble-chart-container">
      <div className="chart-header">
        <h5 className="bubble-chart-title">
          {selectedCategory ? selectedCategory : 'Skills Overview'}
        </h5>
        {selectedCategory && (
          <button className="back-button" onClick={handleBack} aria-label="Back to overview">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>
      
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        role="img"
        aria-label={selectedCategory ? `${selectedCategory} skills detail` : 'Skills overview bubble chart'}
      />
      
      {!selectedCategory && (
        <div className="bubble-chart-legend">
          {Object.entries(categoryColors).slice(0, 7).map(([category, color]) => (
            <div key={category} className="legend-item">
              <span className="legend-color" style={{ backgroundColor: color }}></span>
              <span className="legend-text">{category.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      )}
      
      {selectedCategory && (
        <div className="treemap-legend">
          <p className="legend-hint">Hover to see details. Larger areas = higher scores.</p>
        </div>
      )}

      <style>{`
        .skills-bubble-chart-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          min-height: 320px;
          padding: 1rem;
          background: var(--gradient-subtle);
          border-radius: 1rem;
          box-sizing: border-box;
          position: relative;
        }
        
        .chart-header {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          position: relative;
          margin-bottom: 1rem;
        }
        
        .bubble-chart-title {
          margin: 0;
          color: var(--gray-300);
          font-size: 1.2rem;
          text-align: center;
        }
        
        .back-button {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          isolation: isolate;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.9rem;
          height: 2.9rem;
          padding: 0;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.04)),
            var(--btn-bg-primary);
          border: 1px solid transparent;
          border-radius: 999px;
          color: #fff;
          text-decoration: none;
          box-shadow: 0 12px 28px rgba(176, 108, 19, 0.28);
          cursor: pointer;
          transition:
            background 0.18s ease,
            color 0.18s ease,
            transform 0.18s ease,
            box-shadow 0.18s ease,
            border-color 0.18s ease;
        }

        .back-button::after {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          transition: background-color var(--theme-transition);
          mix-blend-mode: overlay;
        }
        
        .back-button:hover {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.08)),
            var(--btn-br-primary);
          color: #ffffff;
          transform: translateY(calc(-50% - 1px));
          box-shadow: 0 16px 32px rgba(176, 108, 19, 0.35);
        }

        .back-button:hover::after,
        .back-button:focus-visible::after {
          background-color: hsla(var(--gray-999-basis), 0.3);
        }

        .back-button:active {
          transform: translateY(-50%);
          box-shadow: 0 10px 18px rgba(176, 108, 19, 0.24);
        }

        .back-button:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.45);
          outline-offset: 3px;
        }
        
        .back-button svg {
          width: 1rem;
          height: 1rem;
          flex-shrink: 0;
          stroke-width: 2.2;
        }
        
        .skills-bubble-chart-container svg {
          display: block;
          width: min(100%, 600px);
          aspect-ratio: 1 / 1;
          max-width: 100%;
          height: auto;
          overflow: visible;
        }
        
        .bubble-chart-legend,
        .treemap-legend {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1rem;
          padding: 0.5rem;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.7rem;
          color: var(--gray-300);
        }
        
        .legend-color {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .legend-text {
          white-space: nowrap;
        }
        
        .legend-hint {
          font-size: 0.75rem;
          color: var(--gray-400);
          text-align: center;
          margin: 0;
          font-style: italic;
        }
        
        @media (max-width: 768px) {
          .chart-header {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .back-button {
            position: static;
            transform: none;
          }

          .back-button:hover {
            transform: translateY(-1px);
          }

          .back-button:active {
            transform: translateY(0);
          }
          
          .bubble-chart-legend {
            gap: 0.3rem;
          }
          
          .legend-item {
            font-size: 0.6rem;
          }
          
          .legend-color {
            width: 8px;
            height: 8px;
          }
        }
      `}</style>
    </div>
  );
}
