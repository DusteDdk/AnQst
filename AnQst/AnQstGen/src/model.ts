export type ServiceMemberKind =
  | "Call"
  | "Slot"
  | "Emitter"
  | "Output"
  | "Input"
  | "DropTarget"
  | "HoverTarget";

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
  timeoutMs: number;
  hoverThrottleMs: number;
  loc: SourceLoc;
}

export interface SpecWarning {
  severity: "warn";
  message: string;
  loc: SourceLoc;
  memberPath: string;
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

export interface ImportedTypeBinding {
  importedName: string;
  localName: string;
}

export interface SpecImportModel {
  moduleSpecifier: string;
  defaultImport: string | null;
  namedImports: ImportedTypeBinding[];
}

export interface ParsedSpecModel {
  filePath: string;
  widgetName: string;
  services: ServiceModel[];
  supportsDevelopmentModeTransport: boolean;
  namespaceTypeDecls: TypeDeclModel[];
  importedTypeDecls: Map<string, TypeDeclModel>;
  importedTypeSymbols: Set<string>;
  specImports: SpecImportModel[];
  warnings: SpecWarning[];
}

export interface VerificationStats {
  namespaceDeclaredTypes: number;
  reachableGeneratedTypes: number;
  serviceCount: number;
}
