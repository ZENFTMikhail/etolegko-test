import {
  Container,
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import { DataTable, type UserData } from "../DataTable/DataTable";
import { useAnalytics } from "../../hooks/useAnalytics";
import type { MRT_Row } from "material-react-table";

const Dashboard = () => {
  const { user, logout } = useAuth();

  const {
    data: analyticsData,
    pagination,
    metadata,
    isLoading,
    error,
    refreshData,
  } = useAnalytics();

  const tableData: UserData[] = analyticsData.map((item) => ({
    id: item.user_id,
    name: item.name,
    email: item.email,
    role: "Пользователь",
    status: item.total_orders > 0 ? "active" : "inactive",
    createdAt: item.first_order_date,
    total_orders: item.total_orders,
    total_amount: item.total_amount,
    total_discount: item.total_discount,
    avg_order_amount: item.avg_order_amount,
    promo_codes_used: item.promo_codes_used,
    first_order_date: item.first_order_date,
    last_order_date: item.last_order_date,
  }));

  const handleEdit = (row: MRT_Row<UserData>) => {
    console.log("Редактировать пользователя:", {
      id: row.original.id,
      name: row.original.name,
      email: row.original.email,
      fullData: row.original,
    });
  };

  const handleDelete = (row: MRT_Row<UserData>) => {
    const user = row.original;

    if (
      window.confirm(
        `Вы уверены, что хотите удалить пользователя "${user.name}"?`,
      )
    ) {
      console.log("Удаление пользователя:", {
        id: user.id,
        name: user.name,
        email: user.email,
      });
      alert(`Пользователь "${user.name}" будет удален (в реальном приложении)`);
    }
  };
  // Функция для форматирования валюты
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Вычисляем статистику
  const totalStats = {
    totalUsers: pagination.total || 0,
    totalOrders: analyticsData.reduce(
      (sum, user) => sum + (user.total_orders || 0),
      0,
    ),
    totalAmount: analyticsData.reduce(
      (sum, user) => sum + (user.total_amount || 0),
      0,
    ),
    totalDiscount: analyticsData.reduce(
      (sum, user) => sum + (user.total_discount || 0),
      0,
    ),
    activeUsers: analyticsData.filter((user) => (user.total_orders || 0) > 0)
      .length,
    avgOrderAmount:
      analyticsData.length > 0
        ? analyticsData.reduce(
            (sum, user) => sum + (user.avg_order_amount || 0),
            0,
          ) / analyticsData.length
        : 0,
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Заголовок */}
      <Box sx={{ mb: 4 }}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="h4" gutterBottom>
                Панель управления
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Добро пожаловать, <strong>{user?.name || user?.email}</strong>{" "}
                👋
              </Typography>
              {metadata.timestamp && (
                <Typography variant="caption" color="text.secondary">
                  Данные обновлены:{" "}
                  {new Date(metadata.timestamp).toLocaleString("ru-RU")}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={refreshData}
                disabled={isLoading}
              >
                Обновить
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={logout}
                sx={{ minWidth: 120 }}
              >
                Выйти
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Статистика */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          flexWrap: "wrap",
          gap: 3,
          mb: 4,
        }}
      >
        {/* Всего пользователей */}
        <Box
          sx={{
            flex: {
              xs: "1 0 100%",
              sm: "1 0 calc(50% - 12px)",
              md: "1 0 calc(25% - 18px)",
            },
          }}
        >
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Typography color="text.secondary" gutterBottom variant="body2">
              Всего пользователей
            </Typography>
            <Typography variant="h5">{totalStats.totalUsers}</Typography>
            <Chip
              label={`${totalStats.activeUsers} активных`}
              size="small"
              color="success"
              variant="outlined"
              sx={{ mt: 1 }}
            />
          </Paper>
        </Box>

        {/* Всего заказов */}
        <Box
          sx={{
            flex: {
              xs: "1 0 100%",
              sm: "1 0 calc(50% - 12px)",
              md: "1 0 calc(25% - 18px)",
            },
          }}
        >
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Typography color="text.secondary" gutterBottom variant="body2">
              Всего заказов
            </Typography>
            <Typography variant="h5">{totalStats.totalOrders}</Typography>
            <Typography variant="caption" color="text.secondary">
              Средний чек: {formatCurrency(totalStats.avgOrderAmount)}
            </Typography>
          </Paper>
        </Box>

        {/* Общий оборот */}
        <Box
          sx={{
            flex: {
              xs: "1 0 100%",
              sm: "1 0 calc(50% - 12px)",
              md: "1 0 calc(25% - 18px)",
            },
          }}
        >
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Typography color="text.secondary" gutterBottom variant="body2">
              Общий оборот
            </Typography>
            <Typography variant="h5">
              {formatCurrency(totalStats.totalAmount)}
            </Typography>
          </Paper>
        </Box>

        {/* Общая скидка */}
        <Box
          sx={{
            flex: {
              xs: "1 0 100%",
              sm: "1 0 calc(50% - 12px)",
              md: "1 0 calc(25% - 18px)",
            },
          }}
        >
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Typography color="text.secondary" gutterBottom variant="body2">
              Общая скидка
            </Typography>
            <Typography variant="h5" color="success.main">
              {formatCurrency(totalStats.totalDiscount)}
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* Таблица */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h6">Аналитика пользователей</Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {pagination && (
              <Chip
                label={`Страница ${pagination.page} из ${pagination.pages}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            <Button size="small" onClick={refreshData} sx={{ ml: 2 }}>
              Повторить
            </Button>
          </Alert>
        )}

        {isLoading && tableData.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : tableData.length === 0 && !isLoading ? (
          <Alert severity="info">Нет данных для отображения</Alert>
        ) : (
          <DataTable
            data={tableData}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        )}
      </Paper>

      {/* Быстрые действия и информация */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
          mt: 4,
        }}
      >
        {/* Быстрые действия */}
        <Box sx={{ flex: 1 }}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Быстрые действия
            </Typography>
            <Box
              sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}
            >
              <Button variant="outlined" fullWidth>
                Добавить пользователя
              </Button>
              <Button variant="outlined" fullWidth>
                Настройки системы
              </Button>
              <Button variant="outlined" fullWidth>
                Отчеты
              </Button>
            </Box>
          </Paper>
        </Box>

        {/* Информация */}
        <Box sx={{ flex: 1 }}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Информация
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Источник данных: {metadata.source || "Не указан"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Всего записей в базе: {pagination.total || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Отображается: {tableData.length} записей
              </Typography>
              {metadata.timestamp && (
                <Typography variant="body2" color="text.secondary">
                  Последнее обновление:{" "}
                  {new Date(metadata.timestamp).toLocaleString("ru-RU")}
                </Typography>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard;
