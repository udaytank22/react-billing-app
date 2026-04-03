import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useDatabase } from '../../context/DatabaseContext';
import {
  getTasks,
  addTask,
  updateTask,
  deleteTask,
  generateAutoTasks,
  Task,
} from '../../database/dbService';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  format,
  addDays,
  isSameDay,
  startOfDay,
  getMonth,
  getYear,
  setMonth,
  setYear,
} from 'date-fns';
import { Dropdown } from 'react-native-element-dropdown';
import { useToast } from '../../context/ToastContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Tasks'>;

interface Props {
  navigation: NavigationProp;
}

export const TasksScreen: React.FC<Props> = ({ navigation }) => {
  const { db } = useDatabase();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pivotDate, setPivotDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const dateRange = React.useMemo(() => {
    const dates = [];
    for (let i = -15; i < 15; i++) {
      dates.push(addDays(pivotDate, i));
    }
    return dates;
  }, [pivotDate]);

  useEffect(() => {
    // Scroll to pivot/selected date (index 15)
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          x: 15 * (60 + 12) - 20,
          animated: true,
        });
      }
    }, 100);
  }, [pivotDate]);

  const months = [
    { label: 'January', value: 0 },
    { label: 'February', value: 1 },
    { label: 'March', value: 2 },
    { label: 'April', value: 3 },
    { label: 'May', value: 4 },
    { label: 'June', value: 5 },
    { label: 'July', value: 6 },
    { label: 'August', value: 7 },
    { label: 'September', value: 8 },
    { label: 'October', value: 9 },
    { label: 'November', value: 10 },
    { label: 'December', value: 11 },
  ];

  const years = Array.from({ length: 10 }, (_, i) => ({
    label: (new Date().getFullYear() - 2 + i).toString(),
    value: new Date().getFullYear() - 2 + i,
  }));

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const fetchTasks = useCallback(async () => {
    if (db) {
      await generateAutoTasks(db);
      const data = await getTasks(db);
      setTasks(data);
    }
  }, [db]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  const handleSaveTask = async () => {
    if (!title.trim()) {
      showToast('Please enter a title', 'error');
      return;
    }

    if (!db) return;

    try {
      if (editingTask) {
        await updateTask(db, editingTask.id, {
          title: title.trim(),
          description: description.trim(),
        });
        showToast('Task updated successfully', 'success');
      } else {
        await addTask(db, {
          title: title.trim(),
          description: description.trim(),
          status: 'pending',
          type: 'manual',
          due_date: new Date().toISOString(),
        });
        showToast('Task added successfully', 'success');
      }
      setShowModal(false);
      resetForm();
      fetchTasks();
    } catch (error) {
      console.error(error);
      showToast('Failed to save task', 'error');
    }
  };

  const handleToggleStatus = async (task: Task) => {
    if (!db) return;
    try {
      const newStatus = task.status === 'pending' ? 'completed' : 'pending';
      await updateTask(db, task.id, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteTask = (id: number) => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (db) {
            await deleteTask(db, id);
            fetchTasks();
            showToast('Task deleted', 'success');
          }
        },
      },
    ]);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
  };

  const renderTaskItem = ({ item }: { item: Task }) => {
    const isAuto = item.type !== 'manual';
    const isCompleted = item.status === 'completed';

    return (
      <View style={[styles.taskCard, isCompleted && styles.completedCard]}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => handleToggleStatus(item)}
        >
          <Icon
            name={isCompleted ? 'check-circle' : 'circle'}
            size={24}
            color={isCompleted ? Colors.success : Colors.border}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.taskInfo}
          onPress={() => handleEditTask(item)}
          disabled={isAuto}
        >
          <Text style={[styles.taskTitle, isCompleted && styles.completedText]}>
            {item.title}
          </Text>
          {item.description ? (
            <Text
              style={[
                styles.taskDesc,
                isCompleted && styles.completedTextSecondary,
              ]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
          <View style={styles.taskMeta}>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: isAuto
                    ? Colors.primaryLight
                    : Colors.secondaryLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.typeText,
                  { color: isAuto ? Colors.primary : Colors.secondary },
                ]}
              >
                {item.type === 'auto_stock'
                  ? 'STOCK'
                  : item.type === 'auto_payment'
                  ? 'PAYMENT'
                  : 'MANUAL'}
              </Text>
            </View>
            <Text style={styles.dateText}>
              {format(new Date(item.created_at), 'dd MMM')}
            </Text>
            {item.due_date && item.type === 'auto_payment' && (
              <View style={styles.dueBadge}>
                <Icon name="calendar" size={10} color={Colors.warning} />
                <Text style={styles.dueBadgeText}>
                  {format(new Date(item.due_date), 'dd MMM')}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeleteTask(item.id)}
        >
          <Icon name="trash-2" size={18} color={Colors.danger} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Tasks & Notes</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Icon name="plus" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.dateSelectorContainer}>
        <View style={styles.dateSelectorHeader}>
          <View>
            <Text style={styles.selectDateLabel}>SELECT DATE</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.monthYearSelector}
            >
              <Text style={styles.monthYearTitle}>
                {format(selectedDate, 'MMMM yyyy')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dateNavArrows}>
            <TouchableOpacity
              onPress={() => {
                const prev = addDays(pivotDate, -7);
                setPivotDate(prev);
              }}
              style={styles.navArrowBtn}
            >
              <Icon name="arrow-left" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const next = addDays(pivotDate, 7);
                setPivotDate(next);
              }}
              style={styles.navArrowBtn}
            >
              <Icon name="arrow-right" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateScrollContent}
        >
          {dateRange.map((date, index) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateItem,
                  isSelected ? styles.dateItemActive : styles.dateItemInactive,
                ]}
                onPress={() => {
                  setSelectedDate(date);
                  // If user clicks a date far from center, we could re-pivot, but keeping it simple for now
                }}
              >
                <Text
                  style={[
                    styles.dateDayName,
                    isSelected
                      ? styles.datePillTextActive
                      : styles.datePillTextInactive,
                  ]}
                >
                  {format(date, 'EEE').toUpperCase()}
                </Text>
                <Text
                  style={[
                    styles.dateDayNum,
                    isSelected
                      ? styles.datePillTextActive
                      : styles.datePillTextInactive,
                  ]}
                >
                  {format(date, 'd')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={tasks.filter(t => {
          if (!t.due_date) return false;
          return isSameDay(new Date(t.due_date), selectedDate);
        })}
        keyExtractor={item => item.id.toString()}
        renderItem={renderTaskItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="clipboard" size={64} color={Colors.border} />
            <Text style={styles.emptyText}>No tasks for today</Text>
            <Text style={styles.emptySubText}>
              Tasks will be auto-generated for low stock and payments, or you
              can add them manually.
            </Text>
          </View>
        }
      />

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <TouchableOpacity activeOpacity={1} style={styles.modalInner}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingTask ? 'Edit Task' : 'New Task'}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Icon name="x" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Task Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="What needs to be done?"
                  value={title}
                  onChangeText={setTitle}
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add some details..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTask}>
                <Text style={styles.saveBtnText}>
                  {editingTask ? 'UPDATE TASK' : 'SAVE TASK'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerHeader}>Select Month & Year</Text>

            <View style={styles.dropdownRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.dropdownLabel}>Month</Text>
                <Dropdown
                  style={styles.pickerDropdown}
                  data={months}
                  labelField="label"
                  valueField="value"
                  value={getMonth(selectedDate)}
                  onChange={item => {
                    const next = setMonth(selectedDate, item.value);
                    setSelectedDate(next);
                    setPivotDate(next);
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dropdownLabel}>Year</Text>
                <Dropdown
                  style={styles.pickerDropdown}
                  data={years}
                  labelField="label"
                  valueField="value"
                  value={getYear(selectedDate)}
                  onChange={item => {
                    const next = setYear(selectedDate, item.value);
                    setSelectedDate(next);
                    setPivotDate(next);
                  }}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.closePickerBtn}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.closePickerText}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text,
    fontWeight: '700',
  },
  addBtn: {
    padding: 5,
  },
  dateSelectorContainer: {
    backgroundColor: Colors.background,
    paddingBottom: 20,
    paddingTop: 10,
  },
  dateSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  selectDateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  monthYearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthYearTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.text,
  },
  dateNavArrows: {
    flexDirection: 'row',
    gap: 15,
  },
  navArrowBtn: {
    padding: 5,
  },
  dateScrollContent: {
    paddingHorizontal: 15,
    gap: 10,
  },
  dateItem: {
    width: 65,
    height: 110,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
  },
  dateItemInactive: {
    borderColor: Colors.border,
  },
  dateItemActive: {
    borderColor: '#333', // Dark border like in screenshot
    borderWidth: 2,
  },
  dateDayName: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 15,
  },
  dateDayNum: {
    fontSize: 22,
    fontWeight: '800',
  },
  datePillTextInactive: {
    color: Colors.textSecondary,
  },
  datePillTextActive: {
    color: Colors.text,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  taskCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  completedCard: {
    opacity: 0.7,
    backgroundColor: '#F9F9F9',
  },
  checkbox: {
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  taskDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  completedTextSecondary: {
    textDecorationLine: 'line-through',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  dueBadge: {
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueBadgeText: {
    fontSize: 10,
    color: Colors.warning,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    ...Typography.h3,
    color: Colors.text,
    marginTop: 20,
  },
  emptySubText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    minHeight: '50%',
  },
  modalInner: {
    padding: 25,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.text,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 15,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    ...Typography.button,
    color: Colors.white,
    fontWeight: '800',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerCard: {
    width: '85%',
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  pickerHeader: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  dropdownRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dropdownLabel: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  pickerDropdown: {
    height: 50,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closePickerBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closePickerText: {
    ...Typography.button,
    color: Colors.white,
    fontWeight: '800',
  },
});
