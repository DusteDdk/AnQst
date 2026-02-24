export type ServiceMemberKind =
  | "Call"
  | "CallSync"
  | "Slot"
  | "Emitter"
  | "Output"
  | "Input";

export interface SourceLoc {
  file: string;
  line: number;
  column: number;
}

export interface ParameterModel {
  name: string;
  typeText: string;
}

export interface ServiceMemberModel {
  kind: ServiceMemberKind;
  name: string;
  payloadTypeText: string | null;
  parameters: ParameterModel[];
  loc: SourceLoc;
}

export interface ServiceModel {
  name: string;
  baseType: "Service" | "AngularHTTPBaseServerClass";
  members: ServiceMemberModel[];
  loc: SourceLoc;
}

export interface TypeDeclModel {
  name: string;
  kind: "interface" | "type";
  nodeText: string;
  referencedTypeNames: string[];
  loc: SourceLoc;
}

export interface ParsedSpecModel {
  filePath: string;
  widgetName: string;
  services: ServiceModel[];
  supportsDevelopmentModeTransport: boolean;
  namespaceTypeDecls: TypeDeclModel[];
  importedTypeDecls: Map<string, TypeDeclModel>;
  importedTypeSymbols: Set<string>;
}

export interface VerificationStats {
  namespaceDeclaredTypes: number;
  reachableGeneratedTypes: number;
  serviceCount: number;
}
