// Currently based of statuses, variants, should cover all possible scenarios within table boundries

const company_name = 'Seeded company_name Name'
const variants  = [{ status: 'pending', company_name }, { status: 'pending', company_name: '_@@$@*@&%£*&@£*$*(@£*$)@£*&' }, { status: 'unverified', company_name: 0 },  { status: 'unverified', company_name },{ status: 'verified_them', company_name }, { status: 'verified_us', company_name }, { status: 'verified_both', company_name }, { status: 'disconnected', company_name }]

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('connection').del()
  await Promise.all(variants.map(({ status, company_name }) => knex('connection').insert([{ status, company_name}])))
}
