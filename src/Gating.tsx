import {CellPopulation, ExpressedMarker, Expression, Gate, GatingStage, Marker, Panel} from "./models";
import {Combination} from "js-combinatorics";
import React from "react";

const input = `
Aleveolar Macrophages: CD11b+ HLA-DR+ CD206+ CD169+ CD64+ CD11c+ CD14lo CD14- CD45+ 
Interstitial Macrophages: CD64+ CD169lo CD206int HLA-DR+ CD11c+ CD45+
DCs: CD11c+ HLA-DR+ CD169- CD15- CD45+
Monocytes: CD169- CD206- CD14+ CD45+
classical monocytes: CD14hi CD16- CD45+
Intermediate monocytes: CD14hi CD16+ CD45+
Nonclassical monocytes: CD14+ CD16hi CD45+
Neutrophils: CD16+ CD24+ CD15+ CD66bhi CD45+
Epithelial cells Human: EpCAM(CD326)+ CD45- CD31-
`

function arrayOfAll<T>() {
    return function <U extends T[]>(
        array: U & ([T] extends [U[number]] ? unknown : 'Invalid')
    ) {
        return array
    };
}

const expressions = arrayOfAll<Expression>()(['-', '+', 'hi', 'lo', 'int']);

function parseMarker(markerString: string): ExpressedMarker | undefined {
    const expression = expressions.find(it => markerString.endsWith(it))
    if (expression) {
        const marker = markerString.split(expression ?? '')[0];
        return {
            expression,
            marker
        }
    }
}

export function parseInput(): Panel {
    const populations = input.split('\n')
        .map(parseLine)
        .filter((it): it is CellPopulation => !!it);

    const markers = getMarkersInCellPopulations(populations);
    const panel: Panel = {markers, populationsOfInterest: populations};

    generateGatingStrategies(panel);

    return panel;
}

function parseLine(line: string): CellPopulation | undefined {
    const [name, markerStrings] = line.split(':');
    if (markerStrings) {
        const markers = markerStrings.split(' ').map(parseMarker).filter((it): it is ExpressedMarker => it !== undefined)
        return {
            name: name,
            identifyingMarkers: Object.fromEntries(markers.map(it => [it.marker, it.expression]))
        }
    }
}

function getMarkersInCellPopulations(cellPopulations: CellPopulation[]): Marker[] {
    const set = new Set(cellPopulations.flatMap(it => Object.keys(it.identifyingMarkers)));
    return Array.from(set)
}

function populationCountPerMarker(panel: Panel): { [marker: Marker]: number } {
    const counts = panel.markers.map(marker => {
        return [marker, panel.populationsOfInterest.filter(it => !!it.identifyingMarkers[marker]).length]
    })

    return Object.fromEntries(counts);
}

function generateGatingStrategies(panel: Panel) {
    const markerCounts = populationCountPerMarker(panel);
    console.log(markerCounts);
}

function getExpressionGroupsForMarker(marker: Marker, panel: Panel): { [expression in Expression]?: string } {
    return panel.populationsOfInterest.filter(it => !!it.identifyingMarkers[marker])
        .map(it => ({expression: it.identifyingMarkers[marker], name: it.name}))
        .reduce((acc: any, val) => {
            return {
                ...acc,
                [val.expression]: [...(acc[val.expression] ?? []), val.name]
            }
        }, {})
}

export const Gating = () => {
    const panel = parseInput();
    return <div className="grid grid-cols-4">
        {panel.markers.map(marker => <div className="m-2 p-2 rounded-lg bg-slate-500">
                <h1 className="text-xl text-slate-900"> {marker} </h1>
                <div>
                        <pre>
                            {JSON.stringify(getExpressionGroupsForMarker(marker, panel), null, 2)}
                        </pre>
                </div>
            </div>
        )}
    </div>
}


