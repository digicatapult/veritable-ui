// Currently based of statuses, variants, should cover all possible scenarios within table boundries

const company_name = 'Seeded company_name Name'
const company_number = '07964699'
const variants = [
  { status: 'pending', company_number, company_name },
  { status: 'pending', company_number, company_name: '_@@$@*@&%£*&@£*$*(@£*$)@£*&' },
  { status: 'unverified', company_number, company_name: 0 },
  { status: 'unverified', company_number, company_name },
  { status: 'verified_them', company_number, company_name },
  { status: 'verified_us', company_number, company_name },
  { status: 'verified_both', company_number, company_name },
  { status: 'disconnected', company_number, company_name },
]

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex('connection').del()
  await Promise.all(
    variants.map(({ status, company_name }) => knex('connection').insert([{ status, company_name, company_number }]))
  )
}
