export interface Detector {
    lowPass: number
    bandPass: [number, number]
}

export interface Fluorochrome {
    name: string
    excitation: number
    emission: number
}

export type Marker = string;
export interface Antibody {
    marker: Marker,
    fluorochrome: Fluorochrome
}

export type Expression = '+'| '-' | 'hi' | 'lo' | 'int';

export interface ExpressedMarker {
    expression: Expression,
    marker: Marker
}

export type CellGroup = string;

export interface CellPopulation {
    group?: CellGroup;
    name: string;
    identifyingMarkers: {[marker: Marker]: Expression}
}

export interface GatingStage {
    gates: Gate[],
    includedPopulations: CellPopulation[]
}

export interface Gate {
    primary: Marker,
    secondary?: Marker
}

export interface Panel {
    markers: Marker[],
    populationsOfInterest: CellPopulation[]
}

