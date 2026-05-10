/** Shared Mermaid configuration factory.
 *  Returns the mermaid.initialize() options object for the given theme.
 *  Import this from both about.astro (SSR/script tags) and ResumePreview.astro
 *  (used inside openPreview via JSON.stringify).
 */
export function getMermaidConfig(isDark: boolean) {
  const darkVars = {
    background: "#2a2a2a",
    primaryColor: "#00d4ff",
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#ffffff",
    lineColor: "#ffffff",
    secondaryColor: "#ff6b6b",
    tertiaryColor: "#4ecdc4",
    textColor: "#ffffff",
    mainBkg: "#333333",
    secondBkg: "#444444",
    border1: "#ffffff",
    border2: "#ffffff",
    // Sequence diagram specific
    actorBkg: "#333333",
    actorTextColor: "#ffffff",
    actorLineColor: "#ffffff",
    signalColor: "#ffffff",
    signalTextColor: "#ffffff",
    // Class diagram specific
    classText: "#ffffff",
    // Flowchart specific
    edgeLabelBackground: "#333333",
    clusterBkg: "#333333",
    clusterBorder: "#ffffff",
    defaultLinkColor: "#ffffff",
    titleColor: "#ffffff",
    nodeTextColor: "#ffffff",
  };

  const lightVars = {
    background: "#ffffff",
    primaryColor: "#1f5bff",
    primaryTextColor: "#000000",
    primaryBorderColor: "#000000",
    lineColor: "#000000",
    secondaryColor: "#ff3b30",
    tertiaryColor: "#00b894",
    textColor: "#000000",
    mainBkg: "#f7f9fc",
    secondBkg: "#eef3fb",
    border1: "#000000",
    border2: "#000000",
    // Sequence diagram specific
    actorBkg: "#f7f9fc",
    actorTextColor: "#000000",
    actorLineColor: "#000000",
    signalColor: "#000000",
    signalTextColor: "#000000",
    // Class diagram specific
    classText: "#000000",
    // Flowchart specific
    edgeLabelBackground: "#ffffff",
    clusterBkg: "#f7f9fc",
    clusterBorder: "#000000",
    defaultLinkColor: "#000000",
    titleColor: "#000000",
    nodeTextColor: "#000000",
  };

  return {
    startOnLoad: false,
    theme: isDark ? "dark" : "default",
    themeVariables: isDark ? darkVars : lightVars,
  };
}
