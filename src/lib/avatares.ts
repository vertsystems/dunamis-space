// Lista de avatares disponíveis (galeria do perfil).
// O conteúdo vem de `avatares.generated.json`, gerado a partir de
// `static/avatares/` por `scripts/gen-avatares.mjs` no build/dev.
import gerado from './avatares.generated.json';

export type Avatar = { key: string; nome: string; url: string };

export const AVATARES: Avatar[] = gerado as Avatar[];
