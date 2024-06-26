// Currently based of statuses, variants, should cover all possible scenarios within table boundries
const variantsize = 10

export async function prepareVariants() {
  const variants10000 = []
  for (let i = 0; i < variantsize; i++) {
    if (i % 7 == 0) {
      variants10000.push({
        status: 'pending',
        company_number: i.toString().padStart(8, '0'),
        company_name: `Seeded company_name Name ${i.toString()}`,
      })
    } else if (i % 7 == 1) {
      variants10000.push({
        status: 'unverified',
        company_number: i.toString().padStart(8, '0'),
        company_name: `Unverified company_name Name ${i.toString()}`,
      })
    } else if (i % 7 == 2) {
      variants10000.push({
        status: 'verified_them',
        company_number: i.toString().padStart(8, '0'),
        company_name: `VER company_name Name ${i.toString()}`,
      })
    } else if (i % 7 == 3) {
      variants10000.push({
        status: 'verified_us',
        company_number: i.toString().padStart(8, '0'),
        company_name: `VER123 company_name Name ${i.toString()}`,
      })
    } else if (i % 7 == 4) {
      variants10000.push({
        status: 'verified_both',
        company_number: i.toString().padStart(8, '0'),
        company_name: `VER1553 company_name Name ${i.toString()}`,
      })
    } else if (i % 7 == 5) {
      variants10000.push({
        status: 'disconnected',
        company_number: i.toString().padStart(8, '0'),
        company_name: `Unver company_name Name ${i.toString()}`,
      })
    } else {
      variants10000.push({
        status: 'disconnected',
        company_number: i.toString().padStart(8, '0'),
        company_name: `Some other company_name Name ${i.toString()}`,
      })
    }
  }
  variants10000.push({
    status: 'disconnected',
    company_number: '10000009',
    company_name: `DIGICAT`,
  })
  variants10000.push({
    status: 'disconnected',
    company_number: '10000008',
    company_name: `DAGICAT`,
  })
  return variants10000
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  // Deletes ALL existing entries
  await knex('connection').del()
  const variants10000 = await prepareVariants()
  await knex('connection').insert(variants10000)
}
