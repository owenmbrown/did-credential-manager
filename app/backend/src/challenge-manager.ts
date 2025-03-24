import { randomBytes } from 'crypto';

interface Challenge {
    challenge: string;
    createdAt: number;
    expiresAt: number;
    used: boolean;
}

const EXPIRATION_TIMESPAN = 60000; // 1 minute in milliseconds

export class ChallengeManager {
    private challenges: Map<string,Challenge> = new Map();
    
    // a randomly generated number that the user will add to their verifiable presentation to prevent replay attacks
    private generageChallengeSting() : string {
        return randomBytes(32).toString('base64url');
    }
    
    createChallenge() : string {
        const challenge = this.generageChallengeSting();
        
        const currentTimestamp = Date.now();
        
        // store challenge in map
        this.challenges.set(challenge, {
            challenge,
            createdAt: currentTimestamp,
            expiresAt: currentTimestamp + EXPIRATION_TIMESPAN,
            used: false
        });

        // Schedule cleanup for when it expires
        setTimeout(() => {
            this.challenges.delete(challenge);
        }, EXPIRATION_TIMESPAN);

        return challenge;
    }

    verifyChallenge(challenge: string) : boolean {
        const storedChallenge = this.challenges.get(challenge);

        if (!storedChallenge) return false;

        const currentTimestamp = Date.now(); 

        if (currentTimestamp > storedChallenge.expiresAt || storedChallenge.used) return false;

        storedChallenge.used = true;

        return true;
    }
}