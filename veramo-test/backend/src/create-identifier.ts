import { agent } from './veramo/setup'

export default async function createIdentifier() {
  const identifier = await agent.didManagerCreate({ alias: 'default' })
  
  return identifier
}