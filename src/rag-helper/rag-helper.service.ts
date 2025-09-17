import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class RagHelperService implements OnModuleInit {
  private readonly dimensions = 3072
  private readonly lshPlanes = 16;
  private randomLshPlanes: number[][] = [];

  onModuleInit() {
    console.log('Initializing deterministic LSH planes...');
    const seed = Number(process.env.LSH_SEED ?? 42);
    let rng = seed;
    const seededRandom = () => {
      rng = (rng * 1664525 + 1013904223) % 4294967296;
      return rng / 4294967296;
    };

    for (let i = 0; i < this.lshPlanes; i++) {
      const plane = Array.from(
        { length: this.dimensions },
        () => seededRandom() - 0.5,
      );
      this.randomLshPlanes.push(plane);
    }

    console.log(
      `✅ Initialized ${this.lshPlanes} deterministic planes for ${this.dimensions} dims (seed=${seed})`,
    );
  }
  
  generateLsh(vector: number[]): string {
    if (!this.randomLshPlanes.length) {
      throw new Error('LSH planes not initialized');
    }
    return this.randomLshPlanes
      .map((plane) => (this.dot(vector, plane) >= 0 ? '1' : '0'))
      .join('');
  }

  rankCandidates(queryVector: number[], candidates: any[]): any[] {
    return candidates
      .map((c) => ({
        ...c,
        similarity: this.cosine(queryVector, JSON.parse(c.vector)),
      }))
      .sort((a, b) => b.similarity - a.similarity);
  }

  // Helpers
  private dot(a: number[], b: number[]): number {
    return a.reduce((sum, v, i) => sum + v * b[i], 0);
  }

  private cosine(a: number[], b: number[]): number {
    const dot = this.dot(a, b);
    const magA = Math.sqrt(this.dot(a, a));
    const magB = Math.sqrt(this.dot(b, b));
    return magA && magB ? dot / (magA * magB) : 0;
  }

  generateProbePrefixes(
    fullHash: string,
    prefixLength: number,
    probeCount: number,
  ): string[] {
    const base = fullHash.slice(0, prefixLength);
    const prefixes = new Set<string>([base]);
    for (let i = 0; i < probeCount && prefixes.size < probeCount + 1; i++) {
      const bitIndex = i % prefixLength;
      const flipped =
        base.slice(0, bitIndex) +
        (base[bitIndex] === '0' ? '1' : '0') +
        base.slice(bitIndex + 1);
      prefixes.add(flipped);
    }
    return Array.from(prefixes);
  }
}
