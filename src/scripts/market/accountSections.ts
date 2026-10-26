/** Account-only blocks (portfolio, allocation, daily history) stay hidden until the visitor is signed in. */
export function setAccountSections(root: ParentNode, signedIn: boolean) {
    root.querySelectorAll<HTMLElement>('[data-account-only]').forEach((element) => { element.hidden = !signedIn; });
}
