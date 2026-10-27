// Technical certifications shown in the homepage maintainer card; each links to its public verification page.
export type Credential = { id: string; name: string; issuer: string; url: string };

export const CREDENTIALS: readonly Credential[] = [
    { id: 'redhat-jboss-ad248', name: 'Red Hat JBoss Application Administration I (AD248) v7.4', issuer: 'Credly',
      url: 'https://www.credly.com/badges/0584630d-b598-4eba-a6d1-425cb7a997fe' },
    { id: 'fcc-javascript-algorithms', name: 'JavaScript Algorithms and Data Structures', issuer: 'freeCodeCamp',
      url: 'https://www.freecodecamp.org/certification/TianyiKao/javascript-algorithms-and-data-structures' },
    { id: 'fcc-data-visualization', name: 'Data Visualization', issuer: 'freeCodeCamp',
      url: 'https://www.freecodecamp.org/certification/TianyiKao/data-visualization' },
    { id: 'google-digital-transformation', name: 'Digital Transformation with Google Cloud', issuer: 'Google Skills',
      url: 'https://www.skills.google/public_profiles/28b434be-64c8-4b98-b2a6-7851772bda44/badges/3572551' },
];
