import { AnQst } from "anqst";
import type { AxiosRequestConfig } from "axios";
import type { Duration } from "date-fns";
import { z } from "zod";

declare namespace TortureWidget {
  const UserSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
  }>;

  type ZUser = z.infer<typeof UserSchema>;

  interface Envelope {
    request: AxiosRequestConfig;
    backoff: Duration;
    user: ZUser;
  }

  interface EnvelopeService extends AnQst.Service {
    resolve(input: Envelope): AnQst.Call<Envelope>;
    apply(input: Envelope): AnQst.Slot<void>;
    current: AnQst.Input<Envelope>;
    ready: AnQst.Output<boolean>;
    pulse(value: string): AnQst.Emitter;
  }
}
