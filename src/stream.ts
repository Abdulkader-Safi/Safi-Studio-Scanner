// The streaming interface, in the shape the LLM SDKs use: a typed event union,
// an async iterator as the primary way to read it, `.on(type, handler)` to
// subscribe to one kind of event, and one accumulated result you can await.
//
//   const stream = auditStream("https://example.com");
//   for await (const event of stream) {
//     if (event.type === "page_complete") console.log(event.index, event.url);
//   }
//   const report = await stream.finalReport();

import { EventEmitter } from "node:events";
import { audit } from "./audit.js";
import type { AuditEvent, AuditEventType, AuditOptions, AuditReport } from "./types.js";

/** Narrows the union to the one event a `.on()` handler subscribed to. */
export type AuditEventOf<T extends AuditEventType> = Extract<AuditEvent, { type: T }>;

export class AuditStream implements AsyncIterable<AuditEvent> {
  #emitter = new EventEmitter();
  // Events arrive faster than a consumer reads them, so they queue. `#wake`
  // is how a waiting iterator is told there is something to take.
  #queue: AuditEvent[] = [];
  #wake: (() => void) | null = null;
  #ended = false;
  #run: Promise<AuditReport>;
  #error: unknown = null;

  constructor(url: string, options: Partial<AuditOptions> = {}) {
    // The emitter has no listeners yet, so an "error" event here would throw.
    // Errors surface through finalReport() and the iterator instead.
    this.#emitter.setMaxListeners(0);
    this.#run = audit(url, {
      ...options,
      onProgress: (event) => {
        options.onProgress?.(event);
        this.#push(event);
      },
    });
    this.#run.then(
      () => this.#end(null),
      (err) => this.#end(err),
    );
  }

  #push(event: AuditEvent): void {
    this.#queue.push(event);
    this.#emitter.emit(event.type, event);
    this.#emitter.emit("event", event);
    this.#wake?.();
  }

  #end(error: unknown): void {
    this.#error = error;
    this.#ended = true;
    this.#wake?.();
  }

  /**
   * Subscribe to one event type, or to "event" for all of them. Returns the
   * stream, so calls chain.
   */
  on<T extends AuditEventType>(type: T, handler: (event: AuditEventOf<T>) => void): this;
  on(type: "event", handler: (event: AuditEvent) => void): this;
  on(type: string, handler: (event: never) => void): this {
    this.#emitter.on(type, handler as (event: AuditEvent) => void);
    return this;
  }

  off(type: string, handler: (event: never) => void): this {
    this.#emitter.off(type, handler as (event: AuditEvent) => void);
    return this;
  }

  /** The finished report. Awaiting this alone runs the audit to completion. */
  finalReport(): Promise<AuditReport> {
    return this.#run;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<AuditEvent> {
    while (true) {
      while (this.#queue.length > 0) yield this.#queue.shift()!;
      if (this.#ended) {
        if (this.#error) throw this.#error;
        return;
      }
      await new Promise<void>((resolve) => {
        this.#wake = () => {
          this.#wake = null;
          resolve();
        };
      });
    }
  }
}

/**
 * Audit a URL and stream progress as it happens.
 *
 * The audit starts immediately. Iterate the returned stream for events, or
 * just await `finalReport()` if you only want the report.
 */
export function auditStream(url: string, options: Partial<AuditOptions> = {}): AuditStream {
  return new AuditStream(url, options);
}
