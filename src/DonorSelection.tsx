import {useStoreActions, useStoreState} from "easy-peasy";
import {StoreModel} from "./stores/main";
import {SyntheticEvent, useCallback, useEffect, useState} from "react";
import {readFileAsDonorData} from "./stores/transforms";
import {useDropzone} from "react-dropzone";
import React from 'react'
import styled from 'styled-components'
import {TableOptions, useExpanded, useGroupBy, useSortBy, useTable} from 'react-table'

const getInterestingInfo = (donor: string, donorData: any) => {
    const newData = {...donorData};

}

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
                columns: [
                    {
                        Header: 'Fold Change',
                        accessor: 'foldChangeFrequency',
                        aggregate: 'average',
                        Aggregated: ({ value }: any) => `${Math.round(value * 100) / 100} (avg)`,
                    },
                    {
                        Header: 'Stimulated',
                        accessor: 'originalFrequency',
                    },
                    {
                        Header: 'Unstimulated',
                        accessor: 'unstimulatedFrequency',
                    },
                ]
            },
            {
                Header: 'MFI',
                columns: [
                    {
                        Header: 'Fold Change',
                        accessor: 'foldChangeMFI',
                        aggregate: 'average',
                        Aggregated: ({ value }: any) => `${Math.round(value * 100) / 100} (avg)`,
                    },
                    {
                        Header: 'Stimulated',
                        accessor: 'originalMFI',
                    },
                    {
                        Header: 'Unstimulated',
                        accessor: 'unstimulatedMFI',
                    },
                ]
            },
        ],
        []
    )

    const data = React.useMemo(() => {
        if (file && donor) {
            return donorData[file].byRow
        }

        return [];
    }, [donorData, file])


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
        <div className="m-auto flex flex-col items-center w-10/12">
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


const Styles = styled.div`
  padding: 1rem;

  table {
    border-spacing: 0;
    border: 1px solid black;

    tr {
      :last-child {
        td {
          border-bottom: 0;
        }
      }
    }

    th,
    td {
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid black;
      border-right: 1px solid black;

      :last-child {
        border-right: 0;
      }
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
            <table {...getTableProps()}>
                <thead>
                {headerGroups.map(headerGroup => (
                    <tr {...headerGroup.getHeaderGroupProps()}>
                        {headerGroup.headers.map(column => (
                            <th {...column.getHeaderProps()}>
                                {column.canGroupBy ? (
                                    // If the column can be grouped, let's add a toggle
                                    <span {...column.getGroupByToggleProps()}>
                      {column.isGrouped ? '🛑 ' : '👊 '}
                    </span>
                                ) : null}
                                {column.render('Header')}
                                <span {...column.getSortByToggleProps()}>
                    {column.isSorted
                        ? column.isSortedDesc
                            ? ' 🔽'
                            : ' 🔼'
                        : ' ▶️'}
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
