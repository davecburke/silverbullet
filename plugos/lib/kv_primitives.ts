import { KV, KvKey } from "$sb/types.ts";

export type KvQueryOptions = {
  prefix?: KvKey;
};

export interface KvPrimitives {
  batchGet(keys: KvKey[]): Promise<(any | undefined)[]>;
  batchSet(entries: KV[]): Promise<void>;
  batchDelete(keys: KvKey[]): Promise<void>;
  query(options: KvQueryOptions): AsyncIterableIterator<KV>;
  close(): void;
}

/**
 * Turns any KvPrimitives into a KvPrimitives that automatically prefixes all keys (and removes them again when reading)
 */
export class PrefixedKvPrimitives implements KvPrimitives {
  constructor(private wrapped: KvPrimitives, private prefix: KvKey) {
  }

  batchGet(keys: KvKey[]): Promise<any[]> {
    return this.wrapped.batchGet(keys.map((key) => this.applyPrefix(key)));
  }

  batchSet(entries: KV[]): Promise<void> {
    return this.wrapped.batchSet(
      entries.map(({ key, value }) => ({ key: this.applyPrefix(key), value })),
    );
  }

  batchDelete(keys: KvKey[]): Promise<void> {
    return this.wrapped.batchDelete(keys.map((key) => this.applyPrefix(key)));
  }

  async *query(options: KvQueryOptions): AsyncIterableIterator<KV> {
    for await (
      const result of this.wrapped.query({
        prefix: this.applyPrefix(options.prefix),
      })
    ) {
      yield { key: this.stripPrefix(result.key), value: result.value };
    }
  }
  close(): void {
    this.wrapped.close();
  }

  private applyPrefix(key?: KvKey): KvKey {
    return [...this.prefix, ...(key ? key : [])];
  }

  private stripPrefix(key: KvKey): KvKey {
    return key.slice(this.prefix.length);
  }
}
