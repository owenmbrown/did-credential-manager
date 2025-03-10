import { agent } from './veramo/setup'

export default async function listIdentifiers() {
  const identifiers = await agent.didManagerFind()

  console.log(`There are ${identifiers.length} identifiers`)

  return {
    count: identifiers.length,
    identifiers: identifiers.map(id => ({ id }))
  };
}