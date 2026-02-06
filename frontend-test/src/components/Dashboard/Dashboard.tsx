import { useState } from "react";
import {
  Container,
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Snackbar,
} from "@mui/material";
import { Refresh, Add, Settings } from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import { DataTable, type UserData } from "../DataTable/DataTable";
import { useAnalytics } from "../../hooks/useAnalytics";
import { ordersService } from "../../api/orders.service";
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

  // Состояния для модалок
  const [createOrderModalOpen, setCreateOrderModalOpen] = useState(false);
  const [generateOrdersModalOpen, setGenerateOrdersModalOpen] = useState(false);

  // Состояния для формы создания заказа
  const [orderAmount, setOrderAmount] = useState<number>(1000);
  const [promoCode, setPromoCode] = useState<string>("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Состояния для генерации тестовых заказов
  const [testOrdersCount, setTestOrdersCount] = useState<number>(5);
  const [isGeneratingOrders, setIsGeneratingOrders] = useState(false);

  // Уведомления
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  // Преобразуем данные аналитики в формат для таблицы
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

  const handleEdit = (row: MRT_Row<UserData>): void => {
    const user = row.original;
    console.log("Редактировать пользователя:", {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
  };

  const handleDelete = (row: MRT_Row<UserData>): void => {
    const user = row.original;

    const confirmMessage =
      user.total_orders && user.total_orders > 0
        ? `Внимание! У пользователя ${user.name} есть ${user.total_orders} заказов. Удалить пользователя и все его данные?`
        : `Удалить пользователя ${user.name}?`;

    if (window.confirm(confirmMessage)) {
      console.log("Удаление пользователя:", {
        id: user.id,
        name: user.name,
        email: user.email,
        orders: user.total_orders,
        totalAmount: user.total_amount,
      });

      alert(`Функция удаления пользователя "${user.name}" в разработке`);
    }
  };

  // Функция генерации тестовых заказов
  const handleGenerateTestOrders = async () => {
    setIsGeneratingOrders(true);
    try {
      const response = await ordersService.generateTestOrders({
        count: testOrdersCount,
      });
      console.log(response);

      showNotification(
        "success",
        `Сгенерировано ${testOrdersCount} тестовых заказов`,
      );
      setGenerateOrdersModalOpen(false);

      // Обновляем данные после генерации
      setTimeout(() => {
        refreshData();
      }, 1000);
    } catch (err) {
      console.log("Ошибка генерации заказов:", err);
    } finally {
      setIsGeneratingOrders(false);
    }
  };

  // Функция создания заказа
  const handleCreateOrder = async () => {
    if (orderAmount < 1) {
      showNotification("error", "Сумма заказа должна быть положительной");
      return;
    }

    setIsCreatingOrder(true);
    try {
      const response = await ordersService.createOrder({
        amount: orderAmount,
        promoCode: promoCode || undefined,
      });
      console.log(response)

      showNotification("success", "Заказ успешно создан");
      setCreateOrderModalOpen(false);
      setOrderAmount(1000);
      setPromoCode("");

      // Обновляем данные после создания заказа
      setTimeout(() => {
        refreshData();
      }, 1000);
    } catch (err) {
      console.log("Ошибка создания заказа:", err);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Показать уведомление
  const showNotification = (
    severity: "success" | "error" | "info",
    message: string,
  ) => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  // Закрыть уведомление
  const handleCloseNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Уведомления */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

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
              Управление заказами
            </Typography>
            <Box
              sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}
            >
              <Button
                variant="contained"
                fullWidth
                startIcon={<Add />}
                onClick={() => setCreateOrderModalOpen(true)}
              >
                Создать заказ
              </Button>

              <Button
                variant="outlined"
                fullWidth
                startIcon={<Settings />}
                onClick={() => setGenerateOrdersModalOpen(true)}
              >
                Сгенерировать тестовые заказы
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

      {/* Модалка создания заказа */}
      <Dialog
        open={createOrderModalOpen}
        onClose={() => !isCreatingOrder && setCreateOrderModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Создать новый заказ</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Сумма заказа (руб)"
              type="number"
              value={orderAmount}
              onChange={(e) => setOrderAmount(Number(e.target.value))}
              margin="normal"
              InputProps={{ inputProps: { min: 1 } }}
            />

            <TextField
              fullWidth
              label="Промокод (опционально)"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              margin="normal"
              placeholder="SUMMER2024"
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              Заказ будет создан для текущего пользователя
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCreateOrderModalOpen(false)}
            disabled={isCreatingOrder}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateOrder}
            disabled={isCreatingOrder || orderAmount < 1}
          >
            {isCreatingOrder ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Создание...
              </>
            ) : (
              "Создать заказ"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Модалка генерации тестовых заказов */}
      <Dialog
        open={generateOrdersModalOpen}
        onClose={() => !isGeneratingOrders && setGenerateOrdersModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Генерация тестовых заказов</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography gutterBottom>
              Количество заказов для генерации:
            </Typography>

            <Box sx={{ px: 2, py: 3 }}>
              <Slider
                value={testOrdersCount}
                onChange={(_, value) => setTestOrdersCount(value as number)}
                min={1}
                max={50}
                step={1}
                marks={[
                  { value: 1, label: "1" },
                  { value: 10, label: "10" },
                  { value: 25, label: "25" },
                  { value: 50, label: "50" },
                ]}
                valueLabelDisplay="auto"
              />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
              <Chip
                label={`${testOrdersCount} заказов`}
                color="primary"
                variant="outlined"
              />
            </Box>

            <Alert severity="warning" sx={{ mt: 2 }}>
              Будет сгенерировано {testOrdersCount} тестовых заказов для
              пользователя
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setGenerateOrdersModalOpen(false)}
            disabled={isGeneratingOrders}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateTestOrders}
            disabled={isGeneratingOrders}
          >
            {isGeneratingOrders ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Генерация...
              </>
            ) : (
              "Сгенерировать"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard;
