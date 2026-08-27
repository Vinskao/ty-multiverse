/** Shared Mermaid configuration factory.
 *  Returns the mermaid.initialize() options object for the given theme.
 *  Import this from both about.astro (SSR/script tags) and ResumePreview.astro
 *  (used inside openPreview via JSON.stringify).
 */
export function getMermaidConfig(isDark: boolean) {
  const darkVars = {
    // Keep every default Mermaid surface dark enough for white text.  The
    // previous cyan primary fill (#00d4ff) was too light for white labels.
    background: "#111827",
    primaryColor: "#1e3a5f",
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#93c5fd",
    lineColor: "#cbd5e1",
    secondaryColor: "#4c1d3f",
    tertiaryColor: "#134e4a",
    textColor: "#ffffff",
    mainBkg: "#172033",
    secondBkg: "#1f2a3d",
    border1: "#93c5fd",
    border2: "#cbd5e1",
    // Sequence diagram specific
    actorBkg: "#172033",
    actorTextColor: "#ffffff",
    actorLineColor: "#cbd5e1",
    signalColor: "#cbd5e1",
    signalTextColor: "#ffffff",
    // Class diagram specific
    classText: "#ffffff",
    // Flowchart specific
    edgeLabelBackground: "#172033",
    clusterBkg: "#172033",
    clusterBorder: "#93c5fd",
    defaultLinkColor: "#cbd5e1",
    titleColor: "#ffffff",
    nodeTextColor: "#ffffff",
  };

  const lightVars = {
    background: "#ffffff",
    primaryColor: "#1f5bff",
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#12306f",
    lineColor: "#172033",
    secondaryColor: "#ff3b30",
    tertiaryColor: "#00b894",
    textColor: "#000000",
    mainBkg: "#f7f9fc",
    secondBkg: "#eef3fb",
    border1: "#12306f",
    border2: "#172033",
    // Sequence diagram specific
    actorBkg: "#f7f9fc",
    actorTextColor: "#172033",
    actorLineColor: "#172033",
    signalColor: "#172033",
    signalTextColor: "#172033",
    // Class diagram specific
    classText: "#172033",
    // Flowchart specific
    edgeLabelBackground: "#ffffff",
    clusterBkg: "#f7f9fc",
    clusterBorder: "#12306f",
    defaultLinkColor: "#172033",
    titleColor: "#172033",
    nodeTextColor: "#172033",
  };

  return {
    startOnLoad: false,
    theme: isDark ? "dark" : "default",
    themeVariables: isDark ? darkVars : lightVars,
  };
}
