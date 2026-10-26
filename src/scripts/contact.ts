// One source for every homepage email link: the address, the enquiry topics and their prefilled mail.
export const CONTACT_EMAIL = 'tianyikao@gmail.com';

type Lang = 'zh' | 'en';
type Text = Record<Lang, string>;
export type ContactTopic = { id: 'trial' | 'data' | 'feature'; subject: Text; body: Text };

export const CONTACT_TOPICS: readonly ContactTopic[] = [
    { id: 'trial',
      subject: { zh: '申請試用', en: 'Trial access' },
      body: { zh: '目前的研究方式：\n最常看的市場與標的：\n希望先試用的功能：\n',
              en: 'How I research today:\nMarkets and instruments I follow:\nWhat I would like to try first:\n' } },
    { id: 'data',
      subject: { zh: '資料整合', en: 'Data integration' },
      body: { zh: '想整合的資料來源（券商、試算表、報告…）：\n資料更新頻率：\n想在圖表上看到的比較：\n',
              en: 'Data sources to bring in (broker, spreadsheet, reports…):\nHow often they update:\nComparisons I want to chart:\n' } },
    { id: 'feature',
      subject: { zh: '功能需求', en: 'Feature request' },
      body: { zh: '想解決的問題：\n目前怎麼處理：\n理想的結果：\n',
              en: 'The problem I want to solve:\nHow I handle it today:\nWhat a good result looks like:\n' } },
];

export function contactTopic(id: string | null | undefined): ContactTopic {
    return CONTACT_TOPICS.find(topic => topic.id === id) ?? CONTACT_TOPICS[0];
}

function mail(topicId: string | null | undefined, lang: string | null | undefined) {
    const code: Lang = lang === 'en' ? 'en' : 'zh';
    const topic = contactTopic(topicId);
    const brand = code === 'zh' ? 'TY 市場研究室' : 'TY Market Lab';
    return { code, subject: `[${brand}] ${topic.subject[code]}`, body: topic.body[code] };
}

/** mailto link with the topic's subject and template; encodeURIComponent keeps spaces as %20 (RFC 6068), not "+". */
export function mailtoHref(topicId: string | null | undefined, lang: string | null | undefined): string {
    const { subject, body } = mail(topicId, lang);
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** A bare mailto does nothing without a mail app, so each topic also opens Gmail and Outlook web compose pages. */
export function composeLinks(topicId: string | null | undefined, lang: string | null | undefined) {
    const { subject, body } = mail(topicId, lang);
    const query = (params: Record<string, string>) => Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    return {
        gmail: `https://mail.google.com/mail/?${query({ view: 'cm', fs: '1', to: CONTACT_EMAIL, su: subject, body })}`,
        outlook: `https://outlook.live.com/mail/0/deeplink/compose?${query({ to: CONTACT_EMAIL, subject, body })}`,
        mailto: mailtoHref(topicId, lang),
    };
}

/** Recipient, subject and template as plain text, for pasting into any mail service. */
export function mailText(topicId: string | null | undefined, lang: string | null | undefined): string {
    const { code, subject, body } = mail(topicId, lang);
    return code === 'zh' ? `收件人：${CONTACT_EMAIL}\n主旨：${subject}\n\n${body}` : `To: ${CONTACT_EMAIL}\nSubject: ${subject}\n\n${body}`;
}
