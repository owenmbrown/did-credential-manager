#!/usr/bin/env node
/**
 * Holder CLI
 * 
 * Command-line interface for holder operations
 * 
 * @module cli
 */

import { Command } from 'commander';
import { createHolderAgent, HolderAgent } from './agent';
import { logger } from '@did-edu/common';
import * as fs from 'fs';

const program = new Command();

program
  .name('holder')
  .description('DID Education Toolkit - Holder CLI')
  .version('0.1.0');

// Global options
program.option('-d, --db <path>', 'Database path', './holder-credentials.db');
program.option('-e, --endpoint <url>', 'Service endpoint', 'http://localhost:5001/didcomm');

/**
 * Initialize holder agent from CLI options
 */
async function initAgent(): Promise<HolderAgent> {
  const opts = program.opts();
  const agent = await createHolderAgent({
    serviceEndpoint: opts.endpoint,
    dbPath: opts.db,
  });
  return agent;
}

/**
 * DID commands
 */
const didCmd = program.command('did').description('DID operations');

didCmd
  .command('show')
  .description('Show holder DID')
  .action(async () => {
    try {
      const agent = await initAgent();
      console.log(`\n🆔 Holder DID: ${agent.getDid()}\n`);
      agent.close();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Credential commands
 */
const credCmd = program.command('credentials').description('Credential operations');

credCmd
  .command('list')
  .description('List all stored credentials')
  .action(async () => {
    try {
      const agent = await initAgent();
      const credentials = await agent.getCredentials();

      if (credentials.length === 0) {
        console.log('\n📋 No credentials stored\n');
      } else {
        console.log(`\n📋 Stored Credentials (${credentials.length}):\n`);
        credentials.forEach((cred, index) => {
          console.log(`${index + 1}. ID: ${cred.id}`);
          console.log(`   Type: ${cred.type.join(', ')}`);
          console.log(`   Issuer: ${cred.issuer}`);
          console.log(`   Subject: ${cred.subject}`);
          console.log(`   Issued: ${cred.issuanceDate}`);
          if (cred.expirationDate) {
            console.log(`   Expires: ${cred.expirationDate}`);
          }
          console.log('');
        });
      }

      agent.close();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

credCmd
  .command('show <id>')
  .description('Show a specific credential')
  .action(async (id: string) => {
    try {
      const agent = await initAgent();
      const credential = await agent.getCredential(id);

      if (!credential) {
        console.log(`\n❌ Credential not found: ${id}\n`);
      } else {
        console.log('\n📄 Credential Details:\n');
        console.log(JSON.stringify(credential.credential, null, 2));
        console.log('');
      }

      agent.close();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

credCmd
  .command('store <file>')
  .description('Store a credential from a JSON file')
  .action(async (file: string) => {
    try {
      if (!fs.existsSync(file)) {
        console.error(`❌ File not found: ${file}`);
        process.exit(1);
      }

      const credentialJson = fs.readFileSync(file, 'utf-8');
      const credential = JSON.parse(credentialJson);

      const agent = await initAgent();
      await agent.storeCredential(credential);

      console.log(`\n✅ Credential stored successfully\n`);

      agent.close();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

credCmd
  .command('delete <id>')
  .description('Delete a credential')
  .action(async (id: string) => {
    try {
      const agent = await initAgent();
      const deleted = await agent.deleteCredential(id);

      if (deleted) {
        console.log(`\n✅ Credential deleted: ${id}\n`);
      } else {
        console.log(`\n❌ Credential not found: ${id}\n`);
      }

      agent.close();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

credCmd
  .command('request')
  .description('Request a credential from an issuer')
  .requiredOption('-i, --issuer <did>', 'Issuer DID')
  .requiredOption('-t, --type <types...>', 'Credential types')
  .action(async (options) => {
    try {
      const agent = await initAgent();

      await agent.requestCredential({
        issuerDid: options.issuer,
        credentialType: options.type,
      });

      console.log(`\n✅ Credential request sent to ${options.issuer}\n`);

      agent.close();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Presentation commands
 */
const vpCmd = program.command('presentation').description('Presentation operations');

vpCmd
  .command('create')
  .description('Create a Verifiable Presentation')
  .requiredOption('-c, --credentials <ids...>', 'Credential IDs')
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .option('--challenge <challenge>', 'Challenge from verifier')
  .option('--domain <domain>', 'Domain of the verifier')
  .action(async (options) => {
    try {
      const agent = await initAgent();

      // Fetch credentials
      const credentials = [];
      for (const id of options.credentials) {
        const cred = await agent.getCredential(id);
        if (cred) {
          credentials.push(cred.credential);
        } else {
          console.error(`❌ Credential not found: ${id}`);
          agent.close();
          process.exit(1);
        }
      }

      // Create presentation
      const presentation = await agent.createPresentation({
        credentials,
        challenge: options.challenge,
        domain: options.domain,
      });

      // Output
      const output = JSON.stringify(presentation, null, 2);
      if (options.output) {
        fs.writeFileSync(options.output, output);
        console.log(`\n✅ Presentation saved to ${options.output}\n`);
      } else {
        console.log('\n📜 Verifiable Presentation:\n');
        console.log(output);
        console.log('');
      }

      agent.close();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

vpCmd
  .command('send')
  .description('Send a presentation to a verifier')
  .requiredOption('-v, --verifier <did>', 'Verifier DID')
  .requiredOption('-p, --presentation <file>', 'Presentation JSON file')
  .option('-t, --thread <id>', 'Thread ID (if responding to a request)')
  .action(async (options) => {
    try {
      if (!fs.existsSync(options.presentation)) {
        console.error(`❌ File not found: ${options.presentation}`);
        process.exit(1);
      }

      const presentationJson = fs.readFileSync(options.presentation, 'utf-8');
      const presentation = JSON.parse(presentationJson);

      const agent = await initAgent();

      await agent.sendPresentation({
        verifierDid: options.verifier,
        presentation,
        threadId: options.thread,
      });

      console.log(`\n✅ Presentation sent to ${options.verifier}\n`);

      agent.close();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Info command
 */
program
  .command('info')
  .description('Show holder information')
  .action(async () => {
    try {
      const agent = await initAgent();
      const credentials = await agent.getCredentials();

      console.log('\n📊 Holder Information:\n');
      console.log(`🆔 DID: ${agent.getDid()}`);
      console.log(`📋 Credentials: ${credentials.length}`);
      console.log(`💾 Database: ${program.opts().db}`);
      console.log(`🔗 Endpoint: ${program.opts().endpoint}`);
      console.log('');

      agent.close();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();


