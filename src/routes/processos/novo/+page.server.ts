import { acaoCriar } from '$lib/server/crud';
import { processos } from '$lib/server/recursos';
import type { Actions } from './$types';

export const actions: Actions = { default: acaoCriar(processos) };
