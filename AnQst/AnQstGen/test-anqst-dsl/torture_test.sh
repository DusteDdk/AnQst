#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
anqstgen_dir="$(cd "${script_dir}/.." && pwd)"
torture_dir="${script_dir}/torture"
cli_entry="${anqstgen_dir}/dist/src/bin/anqst.js"
spec_file="${torture_dir}/TortureWidget.AnQst.d.ts"
build_root="${torture_dir}/cpp-smoke/build"

echo "[torture] repo: ${anqstgen_dir}"
echo "[torture] scenario: ${torture_dir}"

if [[ ! -f "${cli_entry}" ]]; then
  echo "[torture] dist CLI missing, running npm run build:test"
  (cd "${anqstgen_dir}" && npm run build:test)
fi

echo "[torture] installing torture dependencies"
(cd "${torture_dir}" && npm install)

run_step() {
  local step_name="$1"
  local step_file="$2"
  local stage="generation"
  echo
  echo "[torture] ===== step: ${step_name} ====="

  cp "${step_file}" "${spec_file}"

  (
    cd "${torture_dir}"
    ANQST_DEBUG=true node ../../dist/src/bin/anqst.js generate TortureWidget.AnQst.d.ts --backend tsc
  ) || return $?

  stage="cmake-configure"
  cmake -S "${torture_dir}/cpp-smoke" -B "${build_root}" -DCMAKE_BUILD_TYPE=Debug || return $?

  stage="cmake-build"
  cmake --build "${build_root}" || return $?

  echo "[torture] step passed: ${step_name}"
}

stop_on_failure() {
  local step_name="$1"
  local step_file="$2"
  if ! run_step "${step_name}" "${step_file}"; then
    cp "${step_file}" "${spec_file}"
    echo
    echo "[torture] failure found at step: ${step_name}"
    echo "[torture] failing spec has been left in ${spec_file}"
    exit 1
  fi
}

step_dir="${torture_dir}/steps"
mkdir -p "${step_dir}"

cat > "${step_dir}/01-minimal.AnQst.d.ts" <<'EOF'
import { AnQst } from "anqst";

declare namespace TortureWidget {
  interface PingService extends AnQst.Service {
    ping(value: string): AnQst.Call<string>;
  }
}
EOF

cat > "${step_dir}/02-all-member-kinds.AnQst.d.ts" <<'EOF'
import { AnQst } from "anqst";

declare namespace TortureWidget {
  interface PingService extends AnQst.Service {
    ping(value: string): AnQst.Call<string>;
    setMode(mode: string): AnQst.Slot<void>;
    draft: AnQst.Input<string>;
    ready: AnQst.Output<boolean>;
    pulse(value: number): AnQst.Emitter;
  }
}
EOF

cat > "${step_dir}/03-local-structured-types.AnQst.d.ts" <<'EOF'
import { AnQst } from "anqst";

declare namespace TortureWidget {
  interface Track {
    title: string;
    seconds: number;
  }

  interface Album {
    name: string;
    tracks: Track[];
  }

  interface AlbumService extends AnQst.Service {
    validate(album: Album): AnQst.Call<boolean>;
    upsert(album: Album): AnQst.Slot<void>;
    current: AnQst.Input<Album>;
    locked: AnQst.Output<boolean>;
    pulse(value: string): AnQst.Emitter;
  }
}
EOF

cat > "${step_dir}/04-imported-types.AnQst.d.ts" <<'EOF'
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
EOF

cat > "${step_dir}/05-expected-failure-partial-generic.AnQst.d.ts" <<'EOF'
import { AnQst } from "anqst";

declare namespace TortureWidget {
  interface UserRecord {
    id: string;
    name: string;
  }

  interface GenericEdgeService extends AnQst.Service {
    merge(input: Partial<UserRecord>): AnQst.Call<Partial<UserRecord>>;
  }
}
EOF

echo "[torture] progressively expanding spec until first failure"
stop_on_failure "01-minimal" "${step_dir}/01-minimal.AnQst.d.ts"
stop_on_failure "02-all-member-kinds" "${step_dir}/02-all-member-kinds.AnQst.d.ts"
stop_on_failure "03-local-structured-types" "${step_dir}/03-local-structured-types.AnQst.d.ts"
stop_on_failure "04-imported-types" "${step_dir}/04-imported-types.AnQst.d.ts"
stop_on_failure "05-expected-failure-partial-generic" "${step_dir}/05-expected-failure-partial-generic.AnQst.d.ts"

echo
echo "[torture] no failure found in configured steps"

echo "[torture] debug artifacts:"
ls -R "${torture_dir}/generated_output/intermediate"
