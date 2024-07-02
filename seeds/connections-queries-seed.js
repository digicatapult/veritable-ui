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

export async function queryVariants(connections) {
  const queryVariants = []
  const querySize = 10
  for (let i = 0; i < querySize; i++) {
    const connection = connections[i % connections.length]
    if (i % 3 == 0) {
      queryVariants.push({
        connection_id: connection.id,
        company_name: connection.company_name,
        direction: 'Sent',
        query_type: 'Type A',
        status: 'Pending Your Input',
        action_items: 'View Details',
      })
    } else if (i % 3 == 1) {
      queryVariants.push({
        connection_id: connection.id,
        company_name: connection.company_name,
        direction: 'Received',
        query_type: 'Type B',
        status: 'Resolved',
        action_items: 'View Details',
      })
    } else if (i % 3 == 2) {
      queryVariants.push({
        connection_id: connection.id,
        company_name: connection.company_name,
        direction: 'Sent',
        query_type: 'Type A',
        status: 'Pending Their Input',
        action_items: 'View Details',
      })
    }
  }
  return queryVariants
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  // Deletes ALL existing entries
  await knex('queries').del()
  await knex('connection').del()
  const variants10000 = await prepareVariants()
  await knex('connection').insert(variants10000)
  const firstTenConnections = await knex('connection').orderBy('created_at', 'asc').limit(10)
  const variants = await queryVariants(firstTenConnections)
  await knex('queries').insert(variants)
}
