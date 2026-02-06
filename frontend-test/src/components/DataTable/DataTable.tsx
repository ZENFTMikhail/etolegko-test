import {
  MaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
} from "material-react-table";
import { Box, IconButton, Tooltip } from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  createdAt: string;
  total_orders?: number;
  total_amount?: number;
  total_discount?: number;
  avg_order_amount?: number;
  promo_codes_used?: number;
  first_order_date?: string;
  last_order_date?: string;
}

interface DataTableProps {
  data: UserData[];
  onEdit?: (row: MRT_Row<UserData>) => void;
  onDelete?: (row: MRT_Row<UserData>) => void;
  isLoading?: boolean;
}

export const DataTable = ({
  data,
  onEdit,
  onDelete,
  isLoading = false,
}: DataTableProps) => {

  const columns: MRT_ColumnDef<UserData>[] = [
    {
      accessorKey: "name",
      header: "Имя",
      size: 150,
    },
    {
      accessorKey: "email",
      header: "Email",
      size: 200,
    },
    {
      accessorKey: "role",
      header: "Роль",
      size: 100,
    },
    {
      accessorKey: "status",
      header: "Статус",
      size: 100,
      Cell: ({ cell }) => (
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            backgroundColor:
              cell.getValue<string>() === "active"
                ? "success.light"
                : "error.light",
            color:
              cell.getValue<string>() === "active"
                ? "success.dark"
                : "error.dark",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          {cell.getValue<string>() === "active" ? "Активен" : "Неактивен"}
        </Box>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Дата регистрации",
      size: 150,
      Cell: ({ cell }) =>
        new Date(cell.getValue<string>()).toLocaleDateString("ru-RU"),
    },
  ];

  return (
    <MaterialReactTable
      columns={columns}
      data={data}
      enableRowActions
      positionActionsColumn="last"
      displayColumnDefOptions={{
        "mrt-row-actions": {
          header: "Действия",
          size: 100,
        },
      }}
      renderRowActions={({ row }) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          {onEdit && (
            <Tooltip title="Редактировать">
              <IconButton onClick={() => onEdit(row)}>
                <Edit />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="Удалить">
              <IconButton color="error" onClick={() => onDelete(row)}>
                <Delete />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}
      localization={{
        actions: "Действия",
        clearSearch: "Очистить поиск",
        columnActions: "Действия с колонкой",
        edit: "Редактировать",
        filterByColumn: "Фильтр по {column}",
        hideColumn: "Скрыть колонку",
        noRecordsToDisplay: "Нет данных для отображения",
        search: "Поиск",
        showHideColumns: "Показать/скрыть колонки",
        sortByColumnAsc: "Сортировать по {column} (по возрастанию)",
        sortByColumnDesc: "Сортировать по {column} (по убыванию)",
        toggleDensity: "Изменить плотность",
        toggleFullScreen: "Полный экран",
      }}
      state={{
        isLoading,
      }}
      muiTablePaperProps={{
        elevation: 3,
        sx: { borderRadius: 2 },
      }}
      muiTableContainerProps={{
        sx: { borderRadius: 2 },
      }}
    />
  );
};
