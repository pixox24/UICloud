interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="rounded-md bg-secondary px-3 py-1.5 text-sm transition-colors hover:bg-muted disabled:opacity-30"
      >
        上一页
      </button>
      <span className="px-3 text-sm text-muted-foreground">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="rounded-md bg-secondary px-3 py-1.5 text-sm transition-colors hover:bg-muted disabled:opacity-30"
      >
        下一页
      </button>
    </div>
  );
}
