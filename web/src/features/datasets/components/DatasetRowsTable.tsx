import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Database,
  X,
} from 'lucide-react';
import { DatasetRowsQuery, DatasetRowsResponse } from '../../../types/api';

interface DatasetRowsTableProps {
  columns: string[];
  rowsData: DatasetRowsResponse | null;
  query: DatasetRowsQuery;
  loading: boolean;
  onUpdateQuery: (patch: Partial<DatasetRowsQuery>) => void;
}

export const DatasetRowsTable: React.FC<DatasetRowsTableProps> = ({
  columns,
  rowsData,
  query,
  loading,
  onUpdateQuery,
}) => {
  const [searchInput, setSearchInput] = useState(query.search ?? '');
  const [filterCol, setFilterCol] = useState(query.filter_col ?? '');
  const [filterValue, setFilterValue] = useState(query.filter_value ?? '');

  useEffect(() => {
    setSearchInput(query.search ?? '');
    setFilterCol(query.filter_col ?? '');
    setFilterValue(query.filter_value ?? '');
  }, [query.search, query.filter_col, query.filter_value]);

  const offset = query.offset ?? 0;
  const limit = query.limit ?? 25;
  const filteredTotal = rowsData?.filtered_rows ?? 0;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / limit));

  const applySearchAndFilter = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateQuery({
      search: searchInput.trim(),
      filter_col: filterCol,
      filter_value: filterValue.trim(),
      offset: 0,
    });
  };

  const resetFilters = () => {
    setSearchInput('');
    setFilterCol('');
    setFilterValue('');
    onUpdateQuery({
      search: '',
      filter_col: '',
      filter_value: '',
      sort_by: '',
      sort_desc: false,
      offset: 0,
    });
  };

  const handleSort = (col: string) => {
    const isSame = query.sort_by === col;
    onUpdateQuery({
      sort_by: col,
      sort_desc: isSame ? !query.sort_desc : false,
      offset: 0,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden space-y-0">
      {/* Toolbar: Search & Filter */}
      <form
        onSubmit={applySearchAndFilter}
        className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-slate-50/50 dark:bg-slate-900/40"
      >
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search across all columns..."
              aria-label="Search dataset rows"
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              aria-label="Filter column"
              value={filterCol}
              onChange={(e) => setFilterCol(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Any column</option>
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              placeholder="Column match..."
              aria-label="Filter value"
              disabled={!filterCol}
              className="w-36 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors"
          >
            Apply
          </button>

          {(query.search || query.filter_value || query.sort_by) && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
          <Database className="w-3.5 h-3.5 text-emerald-500" />
          <span>
            {rowsData
              ? `${rowsData.filtered_rows.toLocaleString()} of ${rowsData.total_rows.toLocaleString()} rows`
              : 'Loading...'}
          </span>
        </div>
      </form>

      {/* Data Table */}
      <div className="overflow-x-auto max-h-[28rem]">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-400 w-12">#</th>
              {columns.map((colName) => (
                <th key={colName} className="px-4 py-3 font-medium whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort(colName)}
                    className="inline-flex items-center space-x-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <span>{colName}</span>
                    <ArrowUpDown
                      className={`w-3 h-3 ${
                        query.sort_by === colName ? 'text-brand-500' : 'opacity-40'
                      }`}
                    />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300 font-mono">
            {loading && !rowsData ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-slate-400">
                  Loading dataset rows...
                </td>
              </tr>
            ) : rowsData && rowsData.rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-slate-400">
                  No rows match your current search or filter criteria.
                </td>
              </tr>
            ) : (
              rowsData?.rows.map((row, idx) => (
                <tr key={offset + idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-2 text-slate-400 dark:text-slate-600">
                    {offset + idx + 1}
                  </td>
                  {columns.map((colName) => {
                    const val = row[colName];
                    return (
                      <td key={colName} className="px-4 py-2 whitespace-nowrap">
                        {val === null || val === undefined ? (
                          <span className="italic text-amber-500/80">null</span>
                        ) : (
                          String(val)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center space-x-2">
          <span>Rows per page:</span>
          <select
            aria-label="Rows per page"
            value={limit}
            onChange={(e) => onUpdateQuery({ limit: Number(e.target.value), offset: 0 })}
            className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-slate-900 dark:text-white"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center space-x-3">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => onUpdateQuery({ offset: Math.max(0, offset - limit) })}
              aria-label="Previous page"
              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={offset + limit >= filteredTotal}
              onClick={() => onUpdateQuery({ offset: offset + limit })}
              aria-label="Next page"
              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
