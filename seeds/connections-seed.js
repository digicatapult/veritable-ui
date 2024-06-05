// Currently based of statuses, variants, should cover all possible scenarios within table boundries

// const company_name = 'Seeded company_name Name'
// const company_number = '0000000'
// 10 000 rows, unique comp. nos - change them to start with a 1, interpret as a number, increment and change to stringon insert, don't worry about changing the company name for now...maybe set one to a unique name
// const variants = [
//   { status: 'pending', company_number: company_number + '0', company_name },
//   { status: 'pending', company_number: company_number + '1', company_name: '_@@$@*@&%£*&@£*$*(@£*$)@£*&' },
//   { status: 'unverified', company_number: company_number + '2', company_name: 0 },
//   { status: 'unverified', company_number: company_number + '3', company_name },
//   { status: 'verified_them', company_number: company_number + '4', company_name },
//   { status: 'verified_us', company_number: company_number + '5', company_name },
//   { status: 'verified_both', company_number: company_number + '6', company_name },
//   { status: 'disconnected', company_number: company_number + '7', company_name },
// ]

const variantsize = 10000

export async function prepareVariants() {
  const variants10000 = []
  for (let i = 0; i < variantsize; i++) {
    if (i % 7 == 0) {
      variants10000.push({
        status: 'pending',
        company_number: i.toString(),
        company_name: `Seeded company_name Name ${i.toString()}`,
      })
    } else if (i % 7 == 1) {
      variants10000.push({
        status: 'unverified',
        company_number: i.toString(),
        company_name: `Unverified company_name Name ${i.toString()}`,
      })
    } else if (i % 7 == 2) {
      variants10000.push({
        status: 'verified_them',
        company_number: i.toString(),
        company_name: `VER company_name Name ${i.toString()}`,
      })
    } else if (i % 7 == 3) {
      variants10000.push({
        status: 'verified_us',
        company_number: i.toString(),
        company_name: `VER123 company_name Name ${i.toString()}`,
      })
    } else if (i % 7 == 4) {
      variants10000.push({
        status: 'verified_both',
        company_number: i.toString(),
        company_name: `VER1553 company_name Name ${i.toString()}`,
      })
    } else if (i % 7 == 5) {
      variants10000.push({
        status: 'disconnected',
        company_number: i.toString(),
        company_name: `Unver company_name Name ${i.toString()}`,
      })
    } else {
      variants10000.push({
        status: 'disconnected',
        company_number: i.toString(),
        company_name: `Some other company_name Name ${i.toString()}`,
      })
    }
  }
  variants10000.push({
    status: 'disconnected',
    company_number: '009',
    company_name: `DIGICAT`,
  })
  variants10000.push({
    status: 'disconnected',
    company_number: '008',
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
