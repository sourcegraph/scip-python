/* eslint-disable */
import { util, configure, Writer, Reader } from 'protobufjs/minimal';
import * as Long from 'long';

export const protobufPackage = 'lib.codeintel.lsif_typed';

/**
 * Index represents an LSIF index. An index can be consumed in a streaming
 * fashion by consuming one value at a time. In Java, use `parseDelimetedFrom` to
 * consume the index in a streaming fashion. For other languages like Go, you
 * need to write custom logic that decodes one LSIF `Value` at a time.
 */
export interface Index {
    /** Metadata about this index. */
    metadata: Metadata | undefined;
    /** Documents that belong to this index or the packages that are defined by this index. */
    document: Document[];
    /** Packages that are either referenced from this index or the packages that are defined by this index. */
    package: Package[];
    /** Symbols that are defined outside of this index but are referenced from inside this index. */
    externalSymbols: Symbol[];
}

export interface Metadata {
    toolInfo: ToolInfo | undefined;
    projectRoot: string;
    positionEncoding: Metadata_PositionEncoding;
}

export enum Metadata_PositionEncoding {
    POSITION_ENCODING_UNSPECIFIED = 0,
    POSITION_ENCODING_UTF8 = 1,
    POSITION_ENCODING_UTF16 = 2,
    UNRECOGNIZED = -1,
}

export function metadata_PositionEncodingFromJSON(object: any): Metadata_PositionEncoding {
    switch (object) {
        case 0:
        case 'POSITION_ENCODING_UNSPECIFIED':
            return Metadata_PositionEncoding.POSITION_ENCODING_UNSPECIFIED;
        case 1:
        case 'POSITION_ENCODING_UTF8':
            return Metadata_PositionEncoding.POSITION_ENCODING_UTF8;
        case 2:
        case 'POSITION_ENCODING_UTF16':
            return Metadata_PositionEncoding.POSITION_ENCODING_UTF16;
        case -1:
        case 'UNRECOGNIZED':
        default:
            return Metadata_PositionEncoding.UNRECOGNIZED;
    }
}

export function metadata_PositionEncodingToJSON(object: Metadata_PositionEncoding): string {
    switch (object) {
        case Metadata_PositionEncoding.POSITION_ENCODING_UNSPECIFIED:
            return 'POSITION_ENCODING_UNSPECIFIED';
        case Metadata_PositionEncoding.POSITION_ENCODING_UTF8:
            return 'POSITION_ENCODING_UTF8';
        case Metadata_PositionEncoding.POSITION_ENCODING_UTF16:
            return 'POSITION_ENCODING_UTF16';
        default:
            return 'UNKNOWN';
    }
}

export interface ToolInfo {
    name: string;
    version: string;
}

/** Document defines information about a particular source file. */
export interface Document {
    /** URI-formatted absolute path of the source file on disk (example "file:///path/to/some/file/on/disk.ts"). */
    uri: string;
    /** Symbol occurrences that appear in this file. */
    occurrences: Occurrence[];
    /** Symbols that are defined within this document. */
    symbols: Symbol[];
}

/**
 * Package defines a publishable artifact such as an npm package, Docker
 * container, JVM dependency, or a Cargo crate.
 */
export interface Package {
    /**
     * The unique identifier of this package that can be referenced from
     * `Symbol.package_uri`.  This URI is not intended to be displayed to humans,
     * but it's recommended to use a human-readable format to aid with debugging.
     */
    uri: string;
    /** Name of this package, for example "@types/react" or "com.google.guava:guava". */
    name: string;
    /** Version of this package, for example "0.1.0" or "2.1.5". */
    version: string;
    /** Package manager, for example "npm", "maven" or "cargo". */
    manager: string;
}

/** Symbol defines a symbol, such as a function or an interface. */
export interface Symbol {
    /**
     * The identifier of this symbol, which can be referenced from
     * Occurence. An empty uri means this symbol can be ignored.
     */
    uri: string;
    /**
     * Determines whether this symbol is local to a single document or if can be
     * referenced from multiple documents.
     * Document symbols (`Document.symbols`) can be either local or global.
     * External symbols (`Index.external_symbols`) must be global.
     */
    unique: Symbol_Unique;
    /**
     * (optional, but strongly recommended) The markdown-formatted documentation
     * for this symbol. This field is repeated to allow different kinds of
     * documentation.  For example, it's nice to include both the signature of a
     * method (parameters and return type) along with the accompanying docstring.
     */
    documentation: string[];
    /**
     * (optional) Links to the original package that defines this symbol to
     * enable navigation across different LSIF indexes (whether they come from
     * different projects or git repositories). This field must be non-empty for
     * toplevel symbols (`Value.value`).
     */
    packageUri: string;
    /**
     * (optional) Symbols that should be included together with this symbol when
     * resolving "find references".  For example, the symbol of a TypeScript or
     * Java method that implements an interface method should list the interface
     * method here.
     */
    referenceSymbols: string[];
    /**
     * (optional) Symbols that are "implemented" by this symbol. For example,
     * the symbol of a TypeScript or Java class that implements an interface
     * should list the interface here.
     */
    implementationSymbols: string[];
}

export enum Symbol_Unique {
    UNIQUE_UNSPECIFIED = 0,
    UNIQUE_DOCUMENT = 1,
    UNIQUE_GLOBAL = 2,
    UNRECOGNIZED = -1,
}

export function symbol_UniqueFromJSON(object: any): Symbol_Unique {
    switch (object) {
        case 0:
        case 'UNIQUE_UNSPECIFIED':
            return Symbol_Unique.UNIQUE_UNSPECIFIED;
        case 1:
        case 'UNIQUE_DOCUMENT':
            return Symbol_Unique.UNIQUE_DOCUMENT;
        case 2:
        case 'UNIQUE_GLOBAL':
            return Symbol_Unique.UNIQUE_GLOBAL;
        case -1:
        case 'UNRECOGNIZED':
        default:
            return Symbol_Unique.UNRECOGNIZED;
    }
}

export function symbol_UniqueToJSON(object: Symbol_Unique): string {
    switch (object) {
        case Symbol_Unique.UNIQUE_UNSPECIFIED:
            return 'UNIQUE_UNSPECIFIED';
        case Symbol_Unique.UNIQUE_DOCUMENT:
            return 'UNIQUE_DOCUMENT';
        case Symbol_Unique.UNIQUE_GLOBAL:
            return 'UNIQUE_GLOBAL';
        default:
            return 'UNKNOWN';
    }
}

/** Occurrence associates a source position with a symbol and/or highlighting information. */
export interface Occurrence {
    /**
     * The source position of this occurrence. Must be exactly three or four elements:
     *
     * - Four elements: [startLine, startCharacter, endLine, endCharacter]
     * - Three elements: [startLine, startCharacter, endCharacter] (endLine == startLine)
     *
     * Line numbers and characters are always 0-based. Make sure to increment the
     * line/character values before displaying them in an editor-like UI because
     * editors conventionally use 1-based numbers.
     *
     * Ranges appear frequently in real-world LSIF payloads, the `repeated int32`
     * encoding was chosen over the LSP `Range(start:Position,end:Position)`
     * encoding for performance reasons.  Benchmarks reveal that this change alone
     * reduces the total payload size by ~2x in both compressed JSON or Protobuf
     * encoding. This encoding is admittedly more embarrassing to work with in
     * some programming languages but we hope the increased performance
     * improvements make up for it.
     */
    range: number[];
    /**
     * References the `Symbol.uri` field. Can be empty if this is only a
     * highlighting occurrence.
     */
    symbolUri: string;
    /** Is the symbol_uri defined or referenced at this occurrence? */
    symbolRole: Occurrence_Role;
    /**
     * (optional) Markdown-formatted documentation for this specific range.  If
     * empty, the `Symbol.documentation` field is used instead. One example
     * where this field might be useful is when the symbol represents a generic
     * function (with abstract type parameters such as `List<T>`) and at this
     * occurrence we know the exact values (such as `List<String>`).
     */
    symbolDocumentation: string[];
    /** What syntax highlighting class should be used for this range? */
    highlight: Occurrence_Highlight;
}

export enum Occurrence_Role {
    ROLE_UNSPECIFIED = 0,
    ROLE_DEFINITION = 1,
    ROLE_REFERENCE = 2,
    UNRECOGNIZED = -1,
}

export function occurrence_RoleFromJSON(object: any): Occurrence_Role {
    switch (object) {
        case 0:
        case 'ROLE_UNSPECIFIED':
            return Occurrence_Role.ROLE_UNSPECIFIED;
        case 1:
        case 'ROLE_DEFINITION':
            return Occurrence_Role.ROLE_DEFINITION;
        case 2:
        case 'ROLE_REFERENCE':
            return Occurrence_Role.ROLE_REFERENCE;
        case -1:
        case 'UNRECOGNIZED':
        default:
            return Occurrence_Role.UNRECOGNIZED;
    }
}

export function occurrence_RoleToJSON(object: Occurrence_Role): string {
    switch (object) {
        case Occurrence_Role.ROLE_UNSPECIFIED:
            return 'ROLE_UNSPECIFIED';
        case Occurrence_Role.ROLE_DEFINITION:
            return 'ROLE_DEFINITION';
        case Occurrence_Role.ROLE_REFERENCE:
            return 'ROLE_REFERENCE';
        default:
            return 'UNKNOWN';
    }
}

export enum Occurrence_Highlight {
    HIGHLIGHT_UNSPECIFIED = 0,
    HIGHLIGHT_STRING_LITERAL = 1,
    HIGHLIGHT_NUMERIC_LITERAL = 2,
    HIGHLIGHT_IDENTIFIER = 3,
    HIGHLIGHT_METHOD_IDENTIFIER = 4,
    HIGHLIGHT_TYPE_IDENTIFIER = 5,
    HIGHLIGHT_TERM_IDENTIFIER = 6,
    HIGHLIGHT_LOCAL_IDENTIFIER = 7,
    HIGHLIGHT_SHADED_IDENTIFIER = 8,
    HIGHLIGHT_PACKAGE_IDENTIFIER = 9,
    UNRECOGNIZED = -1,
}

export function occurrence_HighlightFromJSON(object: any): Occurrence_Highlight {
    switch (object) {
        case 0:
        case 'HIGHLIGHT_UNSPECIFIED':
            return Occurrence_Highlight.HIGHLIGHT_UNSPECIFIED;
        case 1:
        case 'HIGHLIGHT_STRING_LITERAL':
            return Occurrence_Highlight.HIGHLIGHT_STRING_LITERAL;
        case 2:
        case 'HIGHLIGHT_NUMERIC_LITERAL':
            return Occurrence_Highlight.HIGHLIGHT_NUMERIC_LITERAL;
        case 3:
        case 'HIGHLIGHT_IDENTIFIER':
            return Occurrence_Highlight.HIGHLIGHT_IDENTIFIER;
        case 4:
        case 'HIGHLIGHT_METHOD_IDENTIFIER':
            return Occurrence_Highlight.HIGHLIGHT_METHOD_IDENTIFIER;
        case 5:
        case 'HIGHLIGHT_TYPE_IDENTIFIER':
            return Occurrence_Highlight.HIGHLIGHT_TYPE_IDENTIFIER;
        case 6:
        case 'HIGHLIGHT_TERM_IDENTIFIER':
            return Occurrence_Highlight.HIGHLIGHT_TERM_IDENTIFIER;
        case 7:
        case 'HIGHLIGHT_LOCAL_IDENTIFIER':
            return Occurrence_Highlight.HIGHLIGHT_LOCAL_IDENTIFIER;
        case 8:
        case 'HIGHLIGHT_SHADED_IDENTIFIER':
            return Occurrence_Highlight.HIGHLIGHT_SHADED_IDENTIFIER;
        case 9:
        case 'HIGHLIGHT_PACKAGE_IDENTIFIER':
            return Occurrence_Highlight.HIGHLIGHT_PACKAGE_IDENTIFIER;
        case -1:
        case 'UNRECOGNIZED':
        default:
            return Occurrence_Highlight.UNRECOGNIZED;
    }
}

export function occurrence_HighlightToJSON(object: Occurrence_Highlight): string {
    switch (object) {
        case Occurrence_Highlight.HIGHLIGHT_UNSPECIFIED:
            return 'HIGHLIGHT_UNSPECIFIED';
        case Occurrence_Highlight.HIGHLIGHT_STRING_LITERAL:
            return 'HIGHLIGHT_STRING_LITERAL';
        case Occurrence_Highlight.HIGHLIGHT_NUMERIC_LITERAL:
            return 'HIGHLIGHT_NUMERIC_LITERAL';
        case Occurrence_Highlight.HIGHLIGHT_IDENTIFIER:
            return 'HIGHLIGHT_IDENTIFIER';
        case Occurrence_Highlight.HIGHLIGHT_METHOD_IDENTIFIER:
            return 'HIGHLIGHT_METHOD_IDENTIFIER';
        case Occurrence_Highlight.HIGHLIGHT_TYPE_IDENTIFIER:
            return 'HIGHLIGHT_TYPE_IDENTIFIER';
        case Occurrence_Highlight.HIGHLIGHT_TERM_IDENTIFIER:
            return 'HIGHLIGHT_TERM_IDENTIFIER';
        case Occurrence_Highlight.HIGHLIGHT_LOCAL_IDENTIFIER:
            return 'HIGHLIGHT_LOCAL_IDENTIFIER';
        case Occurrence_Highlight.HIGHLIGHT_SHADED_IDENTIFIER:
            return 'HIGHLIGHT_SHADED_IDENTIFIER';
        case Occurrence_Highlight.HIGHLIGHT_PACKAGE_IDENTIFIER:
            return 'HIGHLIGHT_PACKAGE_IDENTIFIER';
        default:
            return 'UNKNOWN';
    }
}

function createBaseIndex(): Index {
    return { metadata: undefined, document: [], package: [], externalSymbols: [] };
}

export const Index = {
    encode(message: Index, writer: Writer = Writer.create()): Writer {
        if (message.metadata !== undefined) {
            Metadata.encode(message.metadata, writer.uint32(10).fork()).ldelim();
        }
        for (const v of message.document) {
            Document.encode(v!, writer.uint32(18).fork()).ldelim();
        }
        for (const v of message.package) {
            Package.encode(v!, writer.uint32(26).fork()).ldelim();
        }
        for (const v of message.externalSymbols) {
            Symbol.encode(v!, writer.uint32(34).fork()).ldelim();
        }
        return writer;
    },

    decode(input: Reader | Uint8Array, length?: number): Index {
        const reader = input instanceof Reader ? input : new Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseIndex();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.metadata = Metadata.decode(reader, reader.uint32());
                    break;
                case 2:
                    message.document.push(Document.decode(reader, reader.uint32()));
                    break;
                case 3:
                    message.package.push(Package.decode(reader, reader.uint32()));
                    break;
                case 4:
                    message.externalSymbols.push(Symbol.decode(reader, reader.uint32()));
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): Index {
        return {
            metadata: isSet(object.metadata) ? Metadata.fromJSON(object.metadata) : undefined,
            document: Array.isArray(object?.document) ? object.document.map((e: any) => Document.fromJSON(e)) : [],
            package: Array.isArray(object?.package) ? object.package.map((e: any) => Package.fromJSON(e)) : [],
            externalSymbols: Array.isArray(object?.externalSymbols)
                ? object.externalSymbols.map((e: any) => Symbol.fromJSON(e))
                : [],
        };
    },

    toJSON(message: Index): unknown {
        const obj: any = {};
        message.metadata !== undefined &&
            (obj.metadata = message.metadata ? Metadata.toJSON(message.metadata) : undefined);
        if (message.document) {
            obj.document = message.document.map((e) => (e ? Document.toJSON(e) : undefined));
        } else {
            obj.document = [];
        }
        if (message.package) {
            obj.package = message.package.map((e) => (e ? Package.toJSON(e) : undefined));
        } else {
            obj.package = [];
        }
        if (message.externalSymbols) {
            obj.externalSymbols = message.externalSymbols.map((e) => (e ? Symbol.toJSON(e) : undefined));
        } else {
            obj.externalSymbols = [];
        }
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<Index>, I>>(object: I): Index {
        const message = createBaseIndex();
        message.metadata =
            object.metadata !== undefined && object.metadata !== null
                ? Metadata.fromPartial(object.metadata)
                : undefined;
        message.document = object.document?.map((e) => Document.fromPartial(e)) || [];
        message.package = object.package?.map((e) => Package.fromPartial(e)) || [];
        message.externalSymbols = object.externalSymbols?.map((e) => Symbol.fromPartial(e)) || [];
        return message;
    },
};

function createBaseMetadata(): Metadata {
    return { toolInfo: undefined, projectRoot: '', positionEncoding: 0 };
}

export const Metadata = {
    encode(message: Metadata, writer: Writer = Writer.create()): Writer {
        if (message.toolInfo !== undefined) {
            ToolInfo.encode(message.toolInfo, writer.uint32(10).fork()).ldelim();
        }
        if (message.projectRoot !== '') {
            writer.uint32(18).string(message.projectRoot);
        }
        if (message.positionEncoding !== 0) {
            writer.uint32(24).int32(message.positionEncoding);
        }
        return writer;
    },

    decode(input: Reader | Uint8Array, length?: number): Metadata {
        const reader = input instanceof Reader ? input : new Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseMetadata();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.toolInfo = ToolInfo.decode(reader, reader.uint32());
                    break;
                case 2:
                    message.projectRoot = reader.string();
                    break;
                case 3:
                    message.positionEncoding = reader.int32() as any;
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): Metadata {
        return {
            toolInfo: isSet(object.toolInfo) ? ToolInfo.fromJSON(object.toolInfo) : undefined,
            projectRoot: isSet(object.projectRoot) ? String(object.projectRoot) : '',
            positionEncoding: isSet(object.positionEncoding)
                ? metadata_PositionEncodingFromJSON(object.positionEncoding)
                : 0,
        };
    },

    toJSON(message: Metadata): unknown {
        const obj: any = {};
        message.toolInfo !== undefined &&
            (obj.toolInfo = message.toolInfo ? ToolInfo.toJSON(message.toolInfo) : undefined);
        message.projectRoot !== undefined && (obj.projectRoot = message.projectRoot);
        message.positionEncoding !== undefined &&
            (obj.positionEncoding = metadata_PositionEncodingToJSON(message.positionEncoding));
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<Metadata>, I>>(object: I): Metadata {
        const message = createBaseMetadata();
        message.toolInfo =
            object.toolInfo !== undefined && object.toolInfo !== null
                ? ToolInfo.fromPartial(object.toolInfo)
                : undefined;
        message.projectRoot = object.projectRoot ?? '';
        message.positionEncoding = object.positionEncoding ?? 0;
        return message;
    },
};

function createBaseToolInfo(): ToolInfo {
    return { name: '', version: '' };
}

export const ToolInfo = {
    encode(message: ToolInfo, writer: Writer = Writer.create()): Writer {
        if (message.name !== '') {
            writer.uint32(10).string(message.name);
        }
        if (message.version !== '') {
            writer.uint32(18).string(message.version);
        }
        return writer;
    },

    decode(input: Reader | Uint8Array, length?: number): ToolInfo {
        const reader = input instanceof Reader ? input : new Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseToolInfo();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.name = reader.string();
                    break;
                case 2:
                    message.version = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): ToolInfo {
        return {
            name: isSet(object.name) ? String(object.name) : '',
            version: isSet(object.version) ? String(object.version) : '',
        };
    },

    toJSON(message: ToolInfo): unknown {
        const obj: any = {};
        message.name !== undefined && (obj.name = message.name);
        message.version !== undefined && (obj.version = message.version);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<ToolInfo>, I>>(object: I): ToolInfo {
        const message = createBaseToolInfo();
        message.name = object.name ?? '';
        message.version = object.version ?? '';
        return message;
    },
};

function createBaseDocument(): Document {
    return { uri: '', occurrences: [], symbols: [] };
}

export const Document = {
    encode(message: Document, writer: Writer = Writer.create()): Writer {
        if (message.uri !== '') {
            writer.uint32(10).string(message.uri);
        }
        for (const v of message.occurrences) {
            Occurrence.encode(v!, writer.uint32(18).fork()).ldelim();
        }
        for (const v of message.symbols) {
            Symbol.encode(v!, writer.uint32(26).fork()).ldelim();
        }
        return writer;
    },

    decode(input: Reader | Uint8Array, length?: number): Document {
        const reader = input instanceof Reader ? input : new Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseDocument();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.uri = reader.string();
                    break;
                case 2:
                    message.occurrences.push(Occurrence.decode(reader, reader.uint32()));
                    break;
                case 3:
                    message.symbols.push(Symbol.decode(reader, reader.uint32()));
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): Document {
        return {
            uri: isSet(object.uri) ? String(object.uri) : '',
            occurrences: Array.isArray(object?.occurrences)
                ? object.occurrences.map((e: any) => Occurrence.fromJSON(e))
                : [],
            symbols: Array.isArray(object?.symbols) ? object.symbols.map((e: any) => Symbol.fromJSON(e)) : [],
        };
    },

    toJSON(message: Document): unknown {
        const obj: any = {};
        message.uri !== undefined && (obj.uri = message.uri);
        if (message.occurrences) {
            obj.occurrences = message.occurrences.map((e) => (e ? Occurrence.toJSON(e) : undefined));
        } else {
            obj.occurrences = [];
        }
        if (message.symbols) {
            obj.symbols = message.symbols.map((e) => (e ? Symbol.toJSON(e) : undefined));
        } else {
            obj.symbols = [];
        }
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<Document>, I>>(object: I): Document {
        const message = createBaseDocument();
        message.uri = object.uri ?? '';
        message.occurrences = object.occurrences?.map((e) => Occurrence.fromPartial(e)) || [];
        message.symbols = object.symbols?.map((e) => Symbol.fromPartial(e)) || [];
        return message;
    },
};

function createBasePackage(): Package {
    return { uri: '', name: '', version: '', manager: '' };
}

export const Package = {
    encode(message: Package, writer: Writer = Writer.create()): Writer {
        if (message.uri !== '') {
            writer.uint32(10).string(message.uri);
        }
        if (message.name !== '') {
            writer.uint32(18).string(message.name);
        }
        if (message.version !== '') {
            writer.uint32(26).string(message.version);
        }
        if (message.manager !== '') {
            writer.uint32(34).string(message.manager);
        }
        return writer;
    },

    decode(input: Reader | Uint8Array, length?: number): Package {
        const reader = input instanceof Reader ? input : new Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBasePackage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.uri = reader.string();
                    break;
                case 2:
                    message.name = reader.string();
                    break;
                case 3:
                    message.version = reader.string();
                    break;
                case 4:
                    message.manager = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): Package {
        return {
            uri: isSet(object.uri) ? String(object.uri) : '',
            name: isSet(object.name) ? String(object.name) : '',
            version: isSet(object.version) ? String(object.version) : '',
            manager: isSet(object.manager) ? String(object.manager) : '',
        };
    },

    toJSON(message: Package): unknown {
        const obj: any = {};
        message.uri !== undefined && (obj.uri = message.uri);
        message.name !== undefined && (obj.name = message.name);
        message.version !== undefined && (obj.version = message.version);
        message.manager !== undefined && (obj.manager = message.manager);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<Package>, I>>(object: I): Package {
        const message = createBasePackage();
        message.uri = object.uri ?? '';
        message.name = object.name ?? '';
        message.version = object.version ?? '';
        message.manager = object.manager ?? '';
        return message;
    },
};

function createBaseSymbol(): Symbol {
    return { uri: '', unique: 0, documentation: [], packageUri: '', referenceSymbols: [], implementationSymbols: [] };
}

export const Symbol = {
    encode(message: Symbol, writer: Writer = Writer.create()): Writer {
        if (message.uri !== '') {
            writer.uint32(10).string(message.uri);
        }
        if (message.unique !== 0) {
            writer.uint32(16).int32(message.unique);
        }
        for (const v of message.documentation) {
            writer.uint32(26).string(v!);
        }
        if (message.packageUri !== '') {
            writer.uint32(34).string(message.packageUri);
        }
        for (const v of message.referenceSymbols) {
            writer.uint32(42).string(v!);
        }
        for (const v of message.implementationSymbols) {
            writer.uint32(50).string(v!);
        }
        return writer;
    },

    decode(input: Reader | Uint8Array, length?: number): Symbol {
        const reader = input instanceof Reader ? input : new Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseSymbol();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.uri = reader.string();
                    break;
                case 2:
                    message.unique = reader.int32() as any;
                    break;
                case 3:
                    message.documentation.push(reader.string());
                    break;
                case 4:
                    message.packageUri = reader.string();
                    break;
                case 5:
                    message.referenceSymbols.push(reader.string());
                    break;
                case 6:
                    message.implementationSymbols.push(reader.string());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): Symbol {
        return {
            uri: isSet(object.uri) ? String(object.uri) : '',
            unique: isSet(object.unique) ? symbol_UniqueFromJSON(object.unique) : 0,
            documentation: Array.isArray(object?.documentation) ? object.documentation.map((e: any) => String(e)) : [],
            packageUri: isSet(object.packageUri) ? String(object.packageUri) : '',
            referenceSymbols: Array.isArray(object?.referenceSymbols)
                ? object.referenceSymbols.map((e: any) => String(e))
                : [],
            implementationSymbols: Array.isArray(object?.implementationSymbols)
                ? object.implementationSymbols.map((e: any) => String(e))
                : [],
        };
    },

    toJSON(message: Symbol): unknown {
        const obj: any = {};
        message.uri !== undefined && (obj.uri = message.uri);
        message.unique !== undefined && (obj.unique = symbol_UniqueToJSON(message.unique));
        if (message.documentation) {
            obj.documentation = message.documentation.map((e) => e);
        } else {
            obj.documentation = [];
        }
        message.packageUri !== undefined && (obj.packageUri = message.packageUri);
        if (message.referenceSymbols) {
            obj.referenceSymbols = message.referenceSymbols.map((e) => e);
        } else {
            obj.referenceSymbols = [];
        }
        if (message.implementationSymbols) {
            obj.implementationSymbols = message.implementationSymbols.map((e) => e);
        } else {
            obj.implementationSymbols = [];
        }
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<Symbol>, I>>(object: I): Symbol {
        const message = createBaseSymbol();
        message.uri = object.uri ?? '';
        message.unique = object.unique ?? 0;
        message.documentation = object.documentation?.map((e) => e) || [];
        message.packageUri = object.packageUri ?? '';
        message.referenceSymbols = object.referenceSymbols?.map((e) => e) || [];
        message.implementationSymbols = object.implementationSymbols?.map((e) => e) || [];
        return message;
    },
};

function createBaseOccurrence(): Occurrence {
    return { range: [], symbolUri: '', symbolRole: 0, symbolDocumentation: [], highlight: 0 };
}

export const Occurrence = {
    encode(message: Occurrence, writer: Writer = Writer.create()): Writer {
        writer.uint32(10).fork();
        for (const v of message.range) {
            writer.int32(v);
        }
        writer.ldelim();
        if (message.symbolUri !== '') {
            writer.uint32(18).string(message.symbolUri);
        }
        if (message.symbolRole !== 0) {
            writer.uint32(24).int32(message.symbolRole);
        }
        for (const v of message.symbolDocumentation) {
            writer.uint32(34).string(v!);
        }
        if (message.highlight !== 0) {
            writer.uint32(40).int32(message.highlight);
        }
        return writer;
    },

    decode(input: Reader | Uint8Array, length?: number): Occurrence {
        const reader = input instanceof Reader ? input : new Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseOccurrence();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if ((tag & 7) === 2) {
                        const end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2) {
                            message.range.push(reader.int32());
                        }
                    } else {
                        message.range.push(reader.int32());
                    }
                    break;
                case 2:
                    message.symbolUri = reader.string();
                    break;
                case 3:
                    message.symbolRole = reader.int32() as any;
                    break;
                case 4:
                    message.symbolDocumentation.push(reader.string());
                    break;
                case 5:
                    message.highlight = reader.int32() as any;
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): Occurrence {
        return {
            range: Array.isArray(object?.range) ? object.range.map((e: any) => Number(e)) : [],
            symbolUri: isSet(object.symbolUri) ? String(object.symbolUri) : '',
            symbolRole: isSet(object.symbolRole) ? occurrence_RoleFromJSON(object.symbolRole) : 0,
            symbolDocumentation: Array.isArray(object?.symbolDocumentation)
                ? object.symbolDocumentation.map((e: any) => String(e))
                : [],
            highlight: isSet(object.highlight) ? occurrence_HighlightFromJSON(object.highlight) : 0,
        };
    },

    toJSON(message: Occurrence): unknown {
        const obj: any = {};
        if (message.range) {
            obj.range = message.range.map((e) => Math.round(e));
        } else {
            obj.range = [];
        }
        message.symbolUri !== undefined && (obj.symbolUri = message.symbolUri);
        message.symbolRole !== undefined && (obj.symbolRole = occurrence_RoleToJSON(message.symbolRole));
        if (message.symbolDocumentation) {
            obj.symbolDocumentation = message.symbolDocumentation.map((e) => e);
        } else {
            obj.symbolDocumentation = [];
        }
        message.highlight !== undefined && (obj.highlight = occurrence_HighlightToJSON(message.highlight));
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<Occurrence>, I>>(object: I): Occurrence {
        const message = createBaseOccurrence();
        message.range = object.range?.map((e) => e) || [];
        message.symbolUri = object.symbolUri ?? '';
        message.symbolRole = object.symbolRole ?? 0;
        message.symbolDocumentation = object.symbolDocumentation?.map((e) => e) || [];
        message.highlight = object.highlight ?? 0;
        return message;
    },
};

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin
    ? T
    : T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : T extends {}
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin
    ? P
    : P & { [K in keyof P]: Exact<P[K], I[K]> } & Record<Exclude<keyof I, KeysOfUnion<P>>, never>;

// If you get a compile-error about 'Constructor<Long> and ... have no overlap',
// add '--ts_proto_opt=esModuleInterop=true' as a flag when calling 'protoc'.
if (util.Long !== Long) {
    util.Long = Long as any;
    configure();
}

function isSet(value: any): boolean {
    return value !== null && value !== undefined;
}
