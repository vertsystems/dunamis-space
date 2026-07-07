// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { Permissoes } from '$lib/permissoes';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			session: Session | null;
			user: User | null;
			permissoes: Permissoes;
		}
		interface PageData {
			session: Session | null;
			permissoes?: Permissoes;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
