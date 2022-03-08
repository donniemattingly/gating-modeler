import {useStoreActions, useStoreState} from "easy-peasy";
import {StoreModel} from "./stores/main";
import {SyntheticEvent, useCallback, useEffect, useState} from "react";
import {readFileAsDonorData} from "./stores/transforms";
import {useDropzone} from "react-dropzone";
import React from 'react'
import styled from 'styled-components'
import {TableOptions, useExpanded, useGroupBy, useSortBy, useTable} from 'react-table'
import clsx from "clsx";

const getInterestingInfo = (donor: string, donorData: any) => {
    const newData = {...donorData};

}


const filteredAverage = (leafValues: any[]): any => {
    const filtered = leafValues.map(it => parseFloat(it)).filter(it => !isNaN(it))
    return filtered.reduce((a, b) => a + b, 0) / filtered.length;
}

const IndeterminateCheckbox = React.forwardRef(
    ({indeterminate, ...rest}: any, ref) => {
        const defaultRef: any = React.useRef()
        const resolvedRef = ref || defaultRef

        React.useEffect(() => {
            resolvedRef.current.indeterminate = indeterminate
        }, [resolvedRef, indeterminate])

        return <input type="checkbox" ref={resolvedRef} {...rest} />
    }
)

export const DonorSelection = () => {
    const files = useStoreState<StoreModel>(state => state.transforms.files)
    const donorData = useStoreState<StoreModel>(state => state.transforms.donorData);
    const parseDonorData = useStoreActions<StoreModel>(actions => actions.transforms.parseDonorData);
    const readFile = useStoreActions<StoreModel>(actions => actions.transforms.readFile);

    const [file, setFile] = useState<string>();
    const [donor, setDonor] = useState<string>();

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        for (const file of acceptedFiles) {
            await readFile(file)
        }

        await parseDonorData();
    }, [files])
    const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop})

    const columns = React.useMemo(
        () => [
            {
                Header: 'Cell Type',
                accessor: 'cellType',
            },
            {
                Header: 'Donor',
                accessor: 'donor',
            },
            {
                Header: 'Peptide',
                accessor: 'peptide',
            },
            {
                Header: 'Marker',
                accessor: 'marker',
            },
            {
                Header: 'Frequency',
                columns:
                    [
                        {
                            Header: 'Original',
                            columns: [
                                {
                                    Header: 'Fold Change',
                                    accessor: 'foldChangeFrequency',
                                    aggregate: filteredAverage,
                                    Aggregated: ({value}: any) => `${Math.round(value * 100) / 100} (avg)`,
                                },
                                {
                                    Header: 'Delta',
                                    accessor: 'deltaFrequency',
                                    aggregate: filteredAverage,
                                    Aggregated: ({value}: any) => `${Math.round(value * 100) / 100} (avg)`,
                                },
                                {
                                    Header: 'orig',
                                    accessor: 'originalFrequency',
                                },
                                {
                                    Header: 'un',
                                    accessor: 'unstimulatedFrequency',
                                },
                            ]
                        },
                        {
                            Header: 'With Blocking AntiBody',
                            columns: [
                                {
                                    Header: 'Fold Change',
                                    accessor: 'antibodyFoldChangeFrequency',
                                    aggregate: filteredAverage,
                                    Aggregated: ({value}: any) => `${Math.round(value * 100) / 100} (avg)`,
                                },
                                {
                                    Header: 'Delta',
                                    accessor: 'antibodyDeltaFrequency',
                                    aggregate: filteredAverage,
                                    Aggregated: ({value}: any) => `${Math.round(value * 100) / 100} (avg)`,
                                },
                                {
                                    Header: 'orig',
                                    accessor: 'antibodyOriginalFrequency',
                                },
                                {
                                    Header: 'un',
                                    accessor: 'antibodyUnstimulatedFrequency',
                                },
                            ]
                        }
                    ]
            },
            {
                Header: 'MFI',
                columns: [
                    {
                        Header: 'Original',
                        columns: [
                            {
                                Header: 'Fold Change',
                                accessor: 'foldChangeMFI',
                                aggregate: filteredAverage,
                                Aggregated: ({value}: any) => `${Math.round(value * 100) / 100} (avg)`,
                            },
                            {
                                Header: 'Delta',
                                accessor: 'deltaMFI',
                                aggregate: filteredAverage,
                                Aggregated: ({value}: any) => `${Math.round(value * 100) / 100} (avg)`,
                            },
                            {
                                Header: 'orig',
                                accessor: 'originalMFI',
                            },
                            {
                                Header: 'un',
                                accessor: 'unstimulatedMFI',
                            },
                        ]
                    },
                    {
                        Header: 'With Blocking Antibody',
                        columns: [
                            {
                                Header: 'Fold Change',
                                accessor: 'antibodyFoldChangeMFI',
                                aggregate: filteredAverage,
                                Aggregated: ({value}: any) => `${Math.round(value * 100) / 100} (avg)`,
                            },
                            {
                                Header: 'Delta',
                                accessor: 'antibodyDeltaMFI',
                                aggregate: filteredAverage,
                                Aggregated: ({value}: any) => `${Math.round(value * 100) / 100} (avg)`,
                            },
                            {
                                Header: 'orig',
                                accessor: 'antibodyOriginalMFI',
                            },
                            {
                                Header: 'un',
                                accessor: 'antibodyUnstimulatedMFI',
                            },
                        ]
                    }
                ]
            },
            {
                Header: 'CD8T IFNy Frequency',
                columns: [
                    {
                        Header: 'Flu',
                        accessor: 'Flu'
                    },
                    {
                        Header: 'SARS',
                        accessor: 'SARS'
                    },
                    {
                        Header: 'RSV',
                        accessor: 'RSV'
                    },
                    {
                        Header: 'CMV',
                        accessor: 'CMV'
                    },
                    {
                        Header: 'EBV',
                        accessor: 'EBV'
                    },
                ]
            }
        ],
        []
    )

    const data = React.useMemo(() => {
        if (file && donor) {
            return donorData[file].byRow
        }

        return [];
    }, [donorData, file])

    console.log(data);


    useEffect(() => {
        const firstFile = Object.keys(donorData)[0];
        const firstDonor = Object.keys(donorData[firstFile] ?? [])[0];
        setFile(firstFile);
        setDonor(firstDonor);
    }, [donorData])

    const handleFileChange = (event: any) => {
        setFile(event.target.value);
    }

    const handleDonorChange = (event: any) => {
        setDonor(event.target.value);
    }

    return (
        <div>
            {files.length === 0
                ? <div {...getRootProps()}
                       className="w-full mt-10 m-auto bg-slate-500 h-80 rounded-xl grid place-items-center">
                    <input {...getInputProps()}/>
                    <h1 className="font-bold text-4xl text-white"> Drop all your files here</h1>
                </div>
                : null
            }

            <Styles>
                <Table columns={columns} data={data}/>
            </Styles>
        </div>
    )
}

const SortButton = (props: { isSorted: boolean, isSortedDesc?: boolean }) => {
    const {isSorted, isSortedDesc} = props;
    return <span className="flex flex-col justify-center items-center" {...props}>
        <i className={clsx("fa-solid fa-caret-up", {'text-emerald-400': isSorted && isSortedDesc})}/>
        <i className={clsx("fa-solid fa-caret-down", {'text-emerald-400': isSorted && !isSortedDesc})}/>
    </span>
}


const Styles = styled.div`
  padding: 1rem;

  table {
    border-spacing: 0;
    //table-layout: fixed;
    width: 100%;
    border: 1px solid black;
    overflow-x: auto;
    border-collapse: separate; /* Don't collapse */

    tr {
      :last-child {
        td {
          border-bottom: 0;
        }
      }
    }

    thead {
      position: sticky;
      top: 0;
      border-bottom: 1px solid black;
      border-right: 1px solid black;
      background: white;
      tr {
        //display: block;
      }
    }

    tbody {
      //display: block;
      overflow: auto;
      width: 100%;
    }

    th,
    td {
      border-bottom: 1px solid black;
      border-right: 1px solid black;
      overflow-wrap: break-word;
      hyphens: auto;

      //:last-child {
      //  border-right: 0;
      //}
    }
  }
`

function Table({columns, data}: any) {
    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
        allColumns,
        getToggleHideAllColumnsProps,
        state: {groupBy, expanded},
    } = useTable<any>(
        {
            columns,
            data,
        },
        useGroupBy,
        useSortBy,
        useExpanded
    )

    // We don't want to render all of the rows for this example, so cap
    // it at 100 for this use case
    const firstPageRows = rows.slice(0, 100)

    return (
        <>
            {/*<div>*/}
            {/*    <div>*/}
            {/*        <IndeterminateCheckbox {...getToggleHideAllColumnsProps()} /> Toggle*/}
            {/*        All*/}
            {/*    </div>*/}
            {/*    {allColumns.map(column => (*/}
            {/*        <div key={column.id}>*/}
            {/*            <label>*/}
            {/*                <input type="checkbox" {...column.getToggleHiddenProps()} />{' '}*/}
            {/*                {column.id}*/}
            {/*            </label>*/}
            {/*        </div>*/}
            {/*    ))}*/}
            {/*    <br/>*/}
            {/*</div>*/}
            <table {...getTableProps()}>
                <thead>
                {headerGroups.map(headerGroup => (
                    <tr {...headerGroup.getHeaderGroupProps()}>
                        {headerGroup.headers.map(column => (
                            <th {...column.getHeaderProps()}>
                                <span
                                    className={clsx("flex flex-row justify-between w-full h-full", {'bg-emerald-600': column.isGrouped})}>
                                    <span {...column.getGroupByToggleProps()}>{column.render('Header')} </span>
                                    {column.depth === 2
                                        ? <SortButton isSorted={column.isSorted}
                                                      isSortedDesc={column.isSortedDesc}
                                                      {...column.getSortByToggleProps()} />
                                        : null}

                                </span>
                            </th>
                        ))}
                    </tr>
                ))}
                </thead>
                <tbody {...getTableBodyProps()}>
                {firstPageRows.map((row, i) => {
                    prepareRow(row)
                    return (
                        <tr {...row.getRowProps()}>
                            {row.cells.map(cell => {
                                return (
                                    <td
                                        // For educational purposes, let's color the
                                        // cell depending on what type it is given
                                        // from the useGroupBy hook
                                        {...cell.getCellProps()}
                                        style={{
                                            background: cell.isGrouped
                                                ? '#0aff0082'
                                                : cell.isAggregated
                                                    ? '#ffa50078'
                                                    : cell.isPlaceholder
                                                        ? '#ff000042'
                                                        : 'white',
                                        }}
                                    >
                                        {cell.isGrouped ? (
                                            // If it's a grouped cell, add an expander and row count
                                            <>
                          <span {...row.getToggleRowExpandedProps()}>
                            {row.isExpanded ? '👇' : '👉'}
                          </span>{' '}
                                                {cell.render('Cell')} ({row.subRows.length})
                                            </>
                                        ) : cell.isAggregated ? (
                                            // If the cell is aggregated, use the Aggregated
                                            // renderer for cell
                                            cell.render('Aggregated')
                                        ) : cell.isPlaceholder ? null : ( // For cells with repeated values, render null
                                            // Otherwise, just render the regular cell
                                            cell.render('Cell')
                                        )}
                                    </td>
                                )
                            })}
                        </tr>
                    )
                })}
                </tbody>
            </table>
            <br/>
            <div>Showing the first 100 results of {rows.length} rows</div>
        </>
    )
}
