import { acaoCriar } from '$lib/server/crud';
import { planos } from '$lib/server/recursos';
import type { Actions } from './$types';

export const actions: Actions = { default: acaoCriar(planos) };
