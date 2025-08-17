export function getApiBaseUrl(): string {
	return (import.meta as any).env.PUBLIC_API_BASE_URL || '';
}

export function getOrCreateUserId(storageKey: string = 'qabot_user_id'): string {
	let userId = localStorage.getItem(storageKey);
	if (!userId) {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 15);
		userId = `user_${timestamp}_${random}`;
		localStorage.setItem(storageKey, userId);
	}
	return userId;
}

export function escapeHtml(text: string): string {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

export function scrollToBottom(el: HTMLElement) {
	el.scrollTop = el.scrollHeight;
}

export function getPeopleImage(name: string): string {
	const base = (import.meta as any).env.PUBLIC_PEOPLE_IMAGE_URL || '';
	return `${base}/${encodeURIComponent(name)}Head.png`;
}

export function getDefaultAvatar(): string {
	const base = (import.meta as any).env.PUBLIC_PEOPLE_IMAGE_URL || '';
	return `${base}/default.png`;
}

