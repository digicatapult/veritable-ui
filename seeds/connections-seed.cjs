// Currently based of statuses, variants, should cover all possible scenarios within table boundries

const company_name = 'Seeded company_name Name'
const company_number = '0000000'
const variants = [
  { status: 'pending', company_number: company_number + '0', company_name },
  { status: 'pending', company_number: company_number + '1', company_name: '_@@$@*@&%£*&@£*$*(@£*$)@£*&' },
  { status: 'unverified', company_number: company_number + '2', company_name: 0 },
  { status: 'unverified', company_number: company_number + '3', company_name },
  { status: 'verified_them', company_number: company_number + '4', company_name },
  { status: 'verified_us', company_number: company_number + '5', company_name },
  { status: 'verified_both', company_number: company_number + '6', company_name },
  { status: 'disconnected', company_number: company_number + '7', company_name },
]

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  // Deletes ALL existing entries
  await knex('connection').del()
  await knex('connection').insert(variants)
}
