/** The answers to "who should come?" for one event, as the planning page asks them. */
export interface Brief {
	/** What the event is for, in a sentence or two. */
	goal: string;
	/** Job titles worth inviting: "CIO, CFO, ERP lead". */
	roles: string;
	seniority: string[];
	departments: string[];
	/** Most people to suggest per target company. */
	perCompany: number;
	/** Who not to suggest: competitors, interns, people already engaged by sales… */
	avoid: string;
}

export const SENIORITY = [
	'C-level / owner',
	'VP / Director',
	'Head / Manager',
	'Specialist / Lead'
];

export const DEPARTMENTS = [
	'Executive',
	'IT',
	'Finance',
	'Operations',
	'Supply chain',
	'Sales & marketing',
	'HR'
];

export const EMPTY_BRIEF: Brief = {
	goal: '',
	roles: '',
	seniority: [],
	departments: [],
	perCompany: 3,
	avoid: ''
};

/** Enough of a brief to research against: something about who, not just what. */
export function briefIsReady(b: Brief): boolean {
	return !!(b.roles.trim() || b.seniority.length || b.departments.length);
}
