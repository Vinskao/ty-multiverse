const setupResumePreview = (aboutData, skillsData) => {
  const btn = document.getElementById('export-pdf-btn');
  if (!btn) {
    console.error('Preview Resume button not found.');
    return;
  }

  let printWindow = null;

  btn.addEventListener('click', async () => {
    console.log('Button clicked! Starting preview generation...');
    try {
      btn.textContent = 'Generating Preview...';
      btn.disabled = true;

      if (!printWindow || printWindow.closed) {
        printWindow = window.open('about:blank', '_blank');
        if (!printWindow) {
          alert('Popup blocked! Please allow popups for this site.');
          throw new Error('Popup blocked');
        }
      } else {
        printWindow.focus();
      }
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const content = isMobile 
        ? generateMobileContent(aboutData, skillsData)
        : generateDesktopContent(aboutData, skillsData);
      
      printWindow.document.open();
      printWindow.document.write(content);
      printWindow.document.close();
      console.log('Content written to preview window.');

      if (!isMobile) {
        loadMermaid(printWindow);
      }

    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      btn.textContent = 'Preview Resume';
      btn.disabled = false;
    }
  });
};

const generateMobileContent = (aboutData, skillsData) => {
  // Get language parameter from URL
  const urlParams = new URLSearchParams(window.location.search);
  const lang = urlParams.get('lang') || 'en';
  
  // Define name based on language
  const name = lang === 'zh' ? '高天逸' : 'KAO TIAN YI';
  
  // This function will contain the HTML string for the mobile preview.
  // Due to length, it's defined below.
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Tianyi Kao - Resume Preview</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.4; }
        h1 { color: #514695; font-size: 2rem; margin-bottom: 0.5rem; }
        h2 { color: #333; border-bottom: 2px solid #514695; padding-bottom: 0.3rem; }
        h3 { color: #514695; margin-top: 1rem; }
        h4 { color: #333; margin-top: 0.8rem; }
        .section { margin-bottom: 20px; }
        .experience-item { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 3px solid #514695; }
        .skill-category { margin-bottom: 15px; }
        .skill-category h5 { color: #333; border-bottom: 1px solid rgba(81, 70, 149, 0.3); padding-bottom: 0.2rem; }
        .skill-subcategory { margin-bottom: 10px; }
        .skill-subcategory h6 { color: #333; border-bottom: 1px solid rgba(81, 70, 149, 0.2); padding-bottom: 0.1rem; }
        .skill-tags { display: flex; flex-wrap: wrap; gap: 0.2rem; margin: 5px 0; }
        .skill-tags .pill { display: inline-block; margin: 2px 4px 2px 0; padding: 3px 8px; border-radius: 15px; color: #fff; font-size: 12px; }
        .pill1 { background-color: #b06c13; } .pill2 { background-color: #b7a414; } .pill3 { background-color: #306998; } .pill4 { background-color: #47a248; } .pill5 { background-color: #2496ed; } .pill6 { background-color: #0052cc; } .pill7 { background-color: #671f74; } .pill8 { background-color: #6e1431; } .pill9 { background-color: #146e66; } .pill10 { background-color: #2b5797; }
        .shade1 { opacity: 1.0; } .shade2 { opacity: 0.8; } .shade3 { opacity: 0.6; } .shade4 { opacity: 0.4; } .shade5 { opacity: 0.2; }
        .skill-description, .skill-subdescription { font-size: 0.9rem; color: #666; font-style: italic; margin-top: 0.4rem; }
        .skill-description ul, .skill-subdescription ul { list-style-type: none; padding-left: 0; }
        .skill-description li, .skill-subdescription li { position: relative; padding-left: 1.2rem; margin-bottom: 0.4rem; }
        .skill-description li::before, .skill-subdescription li::before { content: '•'; position: absolute; left: 0; color: #514695; font-weight: bold; }
        ul { list-style-type: none; padding-left: 0; }
        li { position: relative; padding-left: 1.2rem; margin-bottom: 0.6rem; }
        li::before { content: '•'; position: absolute; left: 0; color: #514695; font-weight: bold; }
    </style>
  </head>
  <body>
      <h1>${name}</h1>
      <p>tianyikao@gmail.com</p>
      <div class="section">
        <h2>Background</h2>
        <p>${aboutData.background.replace(/\n/g, '<br>')}</p>
        </div>
      <div class="section">
        <h2>Education</h2>
        ${aboutData.education.map(item => `
          <div>
              <h3>${item.institution}</h3>
            <p>${item.period}</p>
            <ul>
              ${item.programs.map(program => `<li>${program}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
      <div class="section">
        <h2>Experience</h2>
        ${aboutData.experience.map(job => `
          <div class="experience-item">
              <h3>${job.title}</h3>
            <p>${job.company} - ${job.period}</p>
            ${job.projectExperience ? `
              <h4>Project Experience:</h4>
                <ul>
                ${job.projectExperience.map(project => `<li>${project}</li>`).join('')}
                </ul>
            ` : ''}
            ${job.responsibilities ? `
              <h4>Responsibilities:</h4>
                <ul>
                ${job.responsibilities.map(resp => `<li>${resp}</li>`).join('')}
                </ul>
            ` : ''}
            ${job.title === "Open Source Backend Engineer" ? `
              <div class="skills-section">
                ${skillsData.categories.map((category) => `
                  <div class="skill-category">
                    <h5>${category.name}</h5>
                    ${category.subcategories ? `
                    ${category.subcategories.map((subcategory) => `
                      <div class="skill-subcategory">
                        <h6>${subcategory.name}</h6>
                        <div class="skill-tags">
                            ${subcategory.skills.map((skill) => `
                              <span class="pill ${category.pillClass} ${skill.level}">${skill.name}</span>
                            `).join('')}
                        </div>
                      </div>
                      `).join('')}
                    ` : `
                      <div class="skill-tags">
                        ${category.skills.map((skill) => `
                          <span class="pill ${category.pillClass} ${skill.level}">${skill.name}</span>
                        `).join('')}
                      </div>
                    `}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
    </div>
  </body>
  </html>
`;
};

const generateDesktopContent = (aboutData, skillsData) => {
  // Get language parameter from URL
  const urlParams = new URLSearchParams(window.location.search);
  const lang = urlParams.get('lang') || 'en';
  
  // Define name based on language
  const name = lang === 'zh' ? '高天逸' : 'KAO TIAN YI';
  
  // This function will contain the HTML string for the desktop preview.
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Tianyi Kao - Resume Preview</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.4; color: #333; background: white; margin: 0; padding: 15px; }
        .resume-section { margin-bottom: 1.5rem; }
        .section-title { font-size: 1.2rem; color: #333; font-weight: 700; text-transform: uppercase; text-align: center; margin: 0 auto 1rem auto; border-bottom: 2px solid #514695; padding-bottom: 0.3rem; }
        .name-section { text-align: center; margin: 0.8rem 0; padding: 0.8rem 0; border-bottom: 2px solid #ddd; }
        .majestic-name { font-size: 2.8rem; font-weight: 700; letter-spacing: 0.15em; margin: 0 0 0.8rem 0; color: #333; font-family: 'Georgia', serif; line-height: 1.1; }
        .email { font-size: 0.95rem; color: #666; margin: 0; font-weight: 300; letter-spacing: 0.05em; }
        .experience-item { margin-bottom: 2rem; padding: 1.5rem; background: #f9f9f9; border-radius: 8px; border-left: 3px solid #514695; }
        .job-header { margin-bottom: 1rem; }
        .job-header h3 { margin-bottom: 0.3rem; color: #514695; font-size: 1.1rem; font-weight: 600; }
        .job-meta { display: flex; flex-wrap: wrap; gap: 0.8rem; align-items: center; font-size: 0.85rem; }
        .company { font-weight: 600; color: #333; }
        .period { color: #666; font-style: italic; }
        .project-experience h4, .responsibilities h4 { color: #333; font-size: 0.95rem; margin-bottom: 0.8rem; font-weight: 600; }
        .project-experience ul, .responsibilities ul { list-style-type: none; padding-left: 0; }
        .project-experience li, .responsibilities li { position: relative; padding-left: 1.2rem; margin-bottom: 0.6rem; line-height: 1.4; color: #333; font-size: 0.9rem; }
        .project-experience li::before, .responsibilities li::before { content: '•'; position: absolute; left: 0; color: #514695; font-weight: bold; }
        .skills-section { margin-top: 1rem; }
        .skill-category h5 { color: #333; font-size: 0.95rem; font-weight: 600; margin-bottom: 0.4rem; padding-bottom: 0.2rem; border-bottom: 2px solid rgba(81, 70, 149, 0.3); }
        .skill-subcategory h6 { color: #333; font-size: 0.85rem; font-weight: 500; margin-bottom: 0.3rem; padding-bottom: 0.15rem; border-bottom: 1px solid rgba(81, 70, 149, 0.2); }
        .skill-tags { display: flex; flex-wrap: wrap; gap: 0.2rem; }
        .skill-tags .pill { display: inline-block; margin: 2px 4px 2px 0; padding: 3px 8px; border-radius: 15px; color: #fff; font-size: 12px; }
        .pill1 { background-color: #b06c13; } .pill2 { background-color: #b7a414; } .pill3 { background-color: #306998; } .pill4 { background-color: #47a248; } .pill5 { background-color: #2496ed; } .pill6 { background-color: #0052cc; } .pill7 { background-color: #671f74; } .pill8 { background-color: #6e1431; } .pill9 { background-color: #146e66; } .pill10 { background-color: #2b5797; }
        .shade1 { opacity: 1.0; } .shade2 { opacity: 0.8; } .shade3 { opacity: 0.6; } .shade4 { opacity: 0.4; } .shade5 { opacity: 0.2; }
        .mermaid-diagram { margin-top: 0.6rem; padding: 0.4rem; background: #f5f5f5; border-radius: 8px; border: 1px solid rgba(81, 70, 149, 0.2); overflow-x: auto; }
        .mermaid-diagram .mermaid { display: flex; justify-content: center; align-items: center; min-height: 80px; }
        .mermaid-diagram svg { max-width: 100%; height: auto; }
        .education-item { margin-bottom: 0.1rem; padding: 0.3rem; background: #f9f9f9; border-radius: 6px; }
        .education-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.1rem; }
        .education-header h3 { margin-bottom: 0; color: #514695; font-size: 1rem; font-weight: 600; }
        .education-period { font-size: 0.7rem; color: #666; font-style: italic; }
        .education-item ul { list-style-type: none; padding-left: 0; margin: 0; }
        .education-item li { position: relative; padding-left: 0.8rem; margin-bottom: 0.1rem; color: #333; font-size: 0.8rem; }
        .education-item li::before { content: '→'; position: absolute; left: 0; color: #514695; }
    </style>
  </head>
  <body>
    <div class="resume-section">
      <h2 class="section-title">Background</h2>
      <div class="name-section">
        <h1 class="majestic-name">${name}</h1>
        <p class="email">tianyikao@gmail.com</p>
      </div>
      <p>${aboutData.background.replace(/\n/g, '<br>')}</p>
    </div>

    <div class="resume-section">
      <h2 class="section-title">Education</h2>
      ${aboutData.education.map((item) => `
        <div class="education-item">
          <div class="education-header">
            <h3>${item.institution}</h3>
            <span class="education-period">${item.period}</span>
          </div>
          <ul>
            ${item.programs.map((program) => `<li>${program}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </div>

    <div class="resume-section">
      <h2 class="section-title">Experience</h2>
      ${aboutData.experience.map((job) => `
        <div class="experience-item">
          <div class="job-header">
            <h3>${job.title}</h3>
            <div class="job-meta">
              <span class="company">${job.company}</span>
              <span class="period">${job.period}</span>
            </div>
          </div>
          ${job.projectExperience && job.projectExperience.length > 0 ? `
            <div class="project-experience">
              <h4>Project Experience</h4>
              <ul>
                ${job.projectExperience.map((project) => `<li>${project}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          ${job.responsibilities && job.responsibilities.length > 0 ? `
            <div class="responsibilities">
              <h4>Responsibilities</h4>
              <ul>
                ${job.responsibilities.map((responsibility) => `<li>${responsibility}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          ${job.title === "Open Source Backend Engineer" ? `
            <div class="skills-section">
              ${skillsData.categories.map((category) => `
                <div class="skill-category">
                  <h5>${category.name}</h5>
                  ${category.subcategories ? `
                    ${category.subcategories.map((subcategory) => `
                      <div class="skill-subcategory">
                        <h6>${subcategory.name}</h6>
                        <div class="skill-tags">
                            ${subcategory.skills.map((skill) => `<span class="pill ${category.pillClass} ${skill.level}">${skill.name}</span>`).join('')}
                        </div>
                        ${subcategory.name === "Frameworks & Libraries" ? `
                          <div class="mermaid-diagram">
                            <pre class="mermaid">
sequenceDiagram
    participant Client
    participant Controller
    participant Service
    participant Repository
    participant Exception
    participant GlobalExceptionHandler
    participant ErrorResponse
    participant Logger
    Client->>Controller: HTTP Request
    Controller->>Service: 調用服務方法
    Service->>Repository: 數據庫操作
    Repository-->>Service: 返回結果/異常
    alt 發生異常
        Service->>Exception: 拋出業務異常
        Exception-->>Controller: 異常傳播
        Controller->>GlobalExceptionHandler: 捕獲異常
        GlobalExceptionHandler->>Logger: 記錄異常
        GlobalExceptionHandler->>ErrorResponse: 創建錯誤響應
        GlobalExceptionHandler-->>Client: 返回錯誤響應
    else 正常流程
        Service-->>Controller: 返回結果
        Controller-->>Client: 返回成功響應
    end
                            </pre>
                          </div>
                          <div class="mermaid-diagram">
                            <pre class="mermaid">
flowchart TD
    subgraph "API Layer"
        APIRouter["FastAPI Router<br/>(maya_sawa/api/qa.py)"]
    end
    subgraph "Q&A Layer"
        QAEngine["QAEngine"]
        QAChain["QAChain"]
    end
    subgraph "Support Layer"
        NameDetector["NameDetector"]
        ProfileManager["ProfileManager"]
        PeopleWeaponManager["PeopleWeaponManager"]
        PersonalityPromptBuilder["PersonalityPromptBuilder"]
        NameAdapter["NameAdapter"]
        VectorStore["PostgresVectorStore"]
        ChatHistoryManager["ChatHistoryManager"]
    end
    subgraph "External Services"
        OpenAIAPI["OpenAI API<br/>Chat & Embeddings"]
        PeopleAPI["People System API<br/>/tymb/people/*"]
        ArticleAPI["Public Article API<br/>/paprika/articles"]
        PostgresDB["PostgreSQL"]
    end
    Client["Client / Frontend"] --> APIRouter
    APIRouter --> QAEngine
    QAEngine --> QAChain
    APIRouter --> VectorStore
    APIRouter --> ChatHistoryManager
    ChatHistoryManager --> PostgresDB
    QAChain --> NameDetector
    QAChain --> ProfileManager
    QAChain --> PeopleWeaponManager
    QAChain --> PersonalityPromptBuilder
    QAChain --> NameAdapter
    QAChain --> VectorStore
    NameDetector --> OpenAIAPI
    QAChain --> OpenAIAPI
    ProfileManager --> PeopleAPI
    PeopleWeaponManager --> PeopleAPI
    VectorStore --> PostgresDB
    VectorStore --> ArticleAPI
    PeopleWeaponManager --> PostgresDB
                            </pre>
                          </div>
                        ` : ''}
                      </div>
                    `).join('')}
                  ` : `
                    <div class="skill-tags">
                      ${category.skills.map((skill) => `<span class="pill ${category.pillClass} ${skill.level}">${skill.name}</span>`).join('')}
                    </div>
                  `}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  </body>
  </html>
  `;
};

const loadMermaid = (win) => {
  const mermaidScript = win.document.createElement('script');
  mermaidScript.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js';
  mermaidScript.onload = () => {
    console.log('Mermaid script loaded in preview window.');
    const mermaid = win.mermaid;
    if (mermaid) {
      mermaid.initialize({ startOnLoad: true, theme: 'default' });
      mermaid.run();
    }
  };
  mermaidScript.onerror = () => {
    console.error('Failed to load Mermaid script in preview window.');
  };
  win.document.head.appendChild(mermaidScript);
};

export default setupResumePreview; 