import { WriteStream } from 'fs';
import {
    contains,
    DefinitionResult,
    Document,
    EdgeLabels,
    ElementTypes,
    item,
    MetaData,
    moniker,
    Moniker,
    MonikerKind,
    next,
    Range,
    ResultSet,
    textDocument_definition,
    UniquenessLevel,
    VertexLabels,
} from 'lsif-protocol';
import { Position } from 'pyright-internal/common/textRange';

// TODO: This might need to be threadsafe at some point?
let _id = 0;
function nextID(): number {
    _id = _id + 1;
    return _id;
}

export class Emitter {
    constructor(private writer: WriteStream) {
        this.EmitMetadata();
    }

    private write(obj: any) {
        this.writer.write(JSON.stringify(obj) + '\n');
    }

    EmitMetadata(): void {
        let metadata: MetaData = {
            id: nextID(),
            type: ElementTypes.vertex,
            label: VertexLabels.metaData,
            version: '0.5.0',
            positionEncoding: 'utf-16',
        };

        this.write(metadata);
    }

    EmitDocument(uri: string): number {
        let id = nextID();
        this.write({
            id,
            type: ElementTypes.vertex,
            label: VertexLabels.document,
            languageId: 'python',
            uri,
        } as Document);

        return id;
    }

    EmitRange(start: Position, end: Position): number {
        let id = nextID();
        this.write({
            id,
            type: ElementTypes.vertex,
            label: VertexLabels.range,
            start,
            end,
        } as Range);

        return id;
    }

    EmitNext(outV: number, inV: number): number {
        let id = nextID();
        this.write({
            id,
            type: ElementTypes.edge,
            label: EdgeLabels.next,
            outV,
            inV,
        } as next);

        return id;
    }

    EmitResultSet(): number {
        let id = nextID();
        let res: ResultSet = {
            id,
            type: ElementTypes.vertex,
            label: VertexLabels.resultSet,
        };

        this.write(res);
        return id;
    }

    EmitDefinitionResult(): number {
        let id = nextID();
        let res: DefinitionResult = {
            id: id,
            type: ElementTypes.vertex,
            label: VertexLabels.definitionResult,
        };
        this.write(res);

        return id;
    }

    EmitTextDocumentDefinition(outV: number, inV: number): number {
        let id = nextID();
        let res: textDocument_definition = {
            id,
            type: ElementTypes.edge,
            label: EdgeLabels.textDocument_definition,
            outV,
            inV,
        };
        this.write(res);

        return id;
    }

    EmitItem(result: number, items: number[], document: number): number {
        let id = nextID();
        let res: item = {
            id,
            type: ElementTypes.edge,
            label: EdgeLabels.item,
            outV: result,
            inVs: items,
            shard: document,
        };
        this.write(res);

        return id;
    }

    EmitContains(outV: number, inVs: number[]): number {
      let id = nextID();
      let res: contains = {
        id,
        type: ElementTypes.edge,
        label: EdgeLabels.contains,
        outV,
        inVs,
      }
      this.write(res);

      return id;
    }

    EmitExportMoniker(identifier: string, unique: UniquenessLevel): number {
      let id = nextID();
      let res: Moniker = {
        id,
        type: ElementTypes.vertex,
        label: VertexLabels.moniker,
        kind: MonikerKind.export,
        scheme: "pyright",
        identifier,
        unique,
      };
      this.write(res);

      return id;
    }

    EmitMonikerEdge(outV: number, inV: number): number {
      let id = nextID();
      let res: moniker = {
        id,
        type: ElementTypes.edge,
        label: EdgeLabels.moniker,
        outV,
        inV
      };
      this.write(res);
      return id;
    }

}
