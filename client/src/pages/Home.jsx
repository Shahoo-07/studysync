import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSubjectsStore } from '../store/subjects';
import { subjectsService } from '../services/subjects.service';
import Navbar from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import SubjectCard from '../components/syllabus/SubjectCard';
import TopicRow from '../components/syllabus/TopicRow';
import { ChevronDown, ChevronUp, Plus, X, Calendar, Clock, MapPin, Award, Edit2, Trash2 } from 'lucide-react';

export default function Home() {
  const queryClient = useQueryClient();
  const subjects = useSubjectsStore((state) => state.subjects);
  const setSubjects = useSubjectsStore((state) => state.setSubjects);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [newSubjectName, setNewSubjectName] = useState('');
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#FFADAD');

  // Tabs state
  const [activeTab, setActiveTab] = useState('syllabus');

  // Exam Timetable state
  const [showExamModal, setShowExamModal] = useState(false);
  const [editingExamSubject, setEditingExamSubject] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('');
  const [examVenue, setExamVenue] = useState('');
  const [totalMarks, setTotalMarks] = useState('');

  const colors = [
    '#FFADAD', // Pastel Pink
    '#FFD6A5', // Pastel Orange
    '#FDFFB6', // Pastel Yellow
    '#CAFFBF', // Pastel Light Green
    '#9BF6FF', // Pastel Cyan
    '#A0C4FF', // Pastel Blue
    '#BDB2FF', // Pastel Purple
    '#FFC6FF', // Pastel Lavender
    '#C1F0E9', // Pastel Mint/Teal
  ];

  // Fetch subjects
  const { isLoading, error } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await subjectsService.getSubjects();
      setSubjects(response.data);
      return response.data;
    },
  });

  // Create subject mutation
  const createSubjectMutation = useMutation({
    mutationFn: (data) => subjectsService.createSubject(data.name, data.color),
    onSuccess: (response) => {
      useSubjectsStore.getState().addSubject(response.data);
      setNewSubjectName('');
      setShowNewSubject(false);
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });

  // Delete subject mutation
  const deleteSubjectMutation = useMutation({
    mutationFn: (id) => subjectsService.deleteSubject(id),
    onSuccess: (_, id) => {
      useSubjectsStore.getState().deleteSubject(id);
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });

  // Update subject mutation (for scheduling/editing exam)
  const updateSubjectMutation = useMutation({
    mutationFn: ({ id, updates }) => subjectsService.updateSubject(id, updates),
    onSuccess: (response) => {
      useSubjectsStore.getState().updateSubject(response.data.id, response.data);
      setShowExamModal(false);
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });

  const handleCreateSubject = () => {
    if (newSubjectName.trim()) {
      createSubjectMutation.mutate({
        name: newSubjectName,
        color: selectedColor,
      });
    }
  };

  const handleOpenAddExam = () => {
    setEditingExamSubject(null);
    setSelectedSubjectId('');
    setExamDate('');
    setExamTime('');
    setExamVenue('');
    setTotalMarks('');
    setShowExamModal(true);
  };

  const handleOpenEditExam = (subject) => {
    setEditingExamSubject(subject);
    setSelectedSubjectId(subject.id);
    setExamDate(subject.exam_date ? subject.exam_date.substring(0, 10) : '');
    setExamTime(subject.exam_time || '');
    setExamVenue(subject.exam_venue || '');
    setTotalMarks(subject.total_marks || '');
    setShowExamModal(true);
  };

  const handleSaveExam = (e) => {
    e.preventDefault();
    if (!selectedSubjectId || !examDate) return;

    const updates = {
      exam_date: examDate,
      exam_time: examTime || null,
      exam_venue: examVenue || null,
      total_marks: totalMarks ? parseInt(totalMarks) : null,
    };

    updateSubjectMutation.mutate({
      id: selectedSubjectId,
      updates,
    });
  };

  const handleRemoveExam = (subjectId) => {
    if (window.confirm('Are you sure you want to remove this exam from the timetable? This will not delete the subject.')) {
      updateSubjectMutation.mutate({
        id: subjectId,
        updates: {
          exam_date: null,
          exam_time: null,
          exam_venue: null,
          total_marks: null,
        },
      });
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-cream-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-red-600">
            <p className="text-lg font-bold mb-2">Error loading subjects</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <p className="text-brown-dark text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 text-brown-text">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-brown mb-2">
            {activeTab === 'syllabus' ? 'Your Syllabus' : 'Exam Timetable'}
          </h1>
          <p className="text-brown-dark">
            {activeTab === 'syllabus'
              ? 'Build your study plan by adding subjects, chapters, and topics'
              : 'Track and manage your upcoming exams, schedules, and topic progress'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-tan mb-6">
          <button
            onClick={() => setActiveTab('syllabus')}
            className={`px-4 py-2 font-serif font-bold text-lg border-b-2 transition-all ${
              activeTab === 'syllabus'
                ? 'border-brown text-brown'
                : 'border-transparent text-brown-dark/60 hover:text-brown'
            }`}
          >
            Syllabus
          </button>
          <button
            onClick={() => setActiveTab('timetable')}
            className={`px-4 py-2 font-serif font-bold text-lg border-b-2 transition-all ${
              activeTab === 'timetable'
                ? 'border-brown text-brown'
                : 'border-transparent text-brown-dark/60 hover:text-brown'
            }`}
          >
            Exam Timetable
          </button>
        </div>

        {/* Syllabus Tab Content */}
        {activeTab === 'syllabus' && (
          <div>
            {/* New Subject Form */}
            {!showNewSubject ? (
              <Button
                onClick={() => setShowNewSubject(true)}
                className="mb-6"
              >
                <Plus className="w-4 h-4 mr-2 inline" />
                Add Subject
              </Button>
            ) : (
              <div className="card mb-6 border border-tan bg-white">
                <div className="flex gap-4 mb-4">
                  <Input
                    placeholder="Subject name (e.g., Mathematics)"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-brown-text mb-2">
                    Color
                  </label>
                  <div className="grid grid-cols-3 gap-2 w-max">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-lg transition-transform ${
                          selectedColor === color ? 'scale-125 ring-2 ring-brown' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateSubject}
                    disabled={createSubjectMutation.isPending}
                  >
                    Create
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowNewSubject(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Subjects List */}
            {subjects.length === 0 ? (
              <div className="card text-center py-12 border border-tan bg-white">
                <p className="text-2xl font-serif font-bold text-brown mb-2">
                  Welcome to StudySync!
                </p>
                <p className="text-brown-dark">
                  Start by adding your first subject
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {subjects.map((subject) => (
                  <div key={subject.id} className="card border border-tan bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() =>
                          setExpandedSubject(
                            expandedSubject === subject.id ? null : subject.id
                          )
                        }
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: subject.color || '#E8DDD0' }}
                        />
                        <span className="text-xl font-serif font-bold text-brown">
                          {subject.name}
                        </span>
                        {subject.exam_date && (
                          <span className="text-sm text-brown-dark ml-auto">
                            Exam: {new Date(subject.exam_date).toLocaleDateString()}
                          </span>
                        )}
                        {expandedSubject === subject.id ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSubjectMutation.mutate(subject.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {expandedSubject === subject.id && (
                      <SubjectCard subjectId={subject.id} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Exam Timetable Tab Content */}
        {activeTab === 'timetable' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif font-bold text-brown">
                Scheduled Exams
              </h2>
              <Button onClick={handleOpenAddExam}>
                <Plus className="w-4 h-4 mr-2 inline" />
                Schedule Exam
              </Button>
            </div>

            {subjects.filter((sub) => sub.exam_date).length === 0 ? (
              <div className="card text-center py-12 border border-dashed border-tan bg-white">
                <Calendar className="w-12 h-12 text-tan mx-auto mb-3" />
                <p className="text-xl font-serif font-bold text-brown mb-2">
                  No exams scheduled yet
                </p>
                <p className="text-brown-dark mb-4">
                  Schedule your exams to track their progress and calculate your study pace
                </p>
                <Button onClick={handleOpenAddExam}>
                  Schedule an Exam
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {subjects
                  .filter((sub) => sub.exam_date)
                  .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))
                  .map((subject) => {
                    const isExpanded = expandedSubject === subject.id;
                    return (
                      <div
                        key={subject.id}
                        className="card border border-tan relative overflow-hidden transition-all hover:shadow-md bg-white"
                      >
                        {/* Decorative Subject Color Header strip */}
                        <div
                          className="absolute top-0 left-0 right-0 h-2"
                          style={{ backgroundColor: subject.color || '#E8DDD0' }}
                        />

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 pb-4 border-b border-tan/30">
                          <div className="flex items-start gap-4">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                              style={{ backgroundColor: `${subject.color}22` || '#E8DDD022' }}
                            >
                              <Calendar className="w-5 h-5" style={{ color: subject.color }} />
                            </div>
                            <div>
                              <h3 className="text-2xl font-serif font-bold text-brown flex items-center gap-2">
                                {subject.name}
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cream-200 border border-tan text-brown-dark font-sans font-medium">
                                  Exam
                                </span>
                              </h3>
                              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-sm text-brown-dark">
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4 text-brown-dark/70" />
                                  <strong>Date:</strong> {new Date(subject.exam_date).toLocaleDateString(undefined, {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}
                                </span>
                                {subject.exam_time && (
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-brown-dark/70" />
                                    <strong>Time:</strong> {subject.exam_time}
                                  </span>
                                )}
                                {subject.exam_venue && (
                                  <span className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-brown-dark/70" />
                                    <strong>Venue:</strong> {subject.exam_venue}
                                  </span>
                                )}
                                {subject.total_marks && (
                                  <span className="flex items-center gap-1.5">
                                    <Award className="w-4 h-4 text-brown-dark/70" />
                                    <strong>Total Marks:</strong> {subject.total_marks}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditExam(subject)}
                              className="flex items-center gap-1.5"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveExam(subject.id)}
                              className="text-red-700 hover:bg-red-50 hover:text-red-800 flex items-center gap-1.5 border border-red-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove
                            </Button>
                          </div>
                        </div>

                        {/* Collapsible Syllabus details */}
                        <div className="mt-4">
                          <button
                            onClick={() =>
                              setExpandedSubject(
                                isExpanded ? null : subject.id
                              )
                            }
                            className="flex items-center gap-2 py-1.5 px-3 rounded bg-cream-100 hover:bg-cream-200 transition-colors text-sm font-medium text-brown-text focus:outline-none"
                          >
                            <span>
                              {isExpanded ? 'Hide Syllabus Details' : 'Show Syllabus Details'}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-tan/30">
                              <SubjectCard subjectId={subject.id} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Exam Modal */}
      {showExamModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-cream-50 rounded-xl border border-tan shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowExamModal(false)}
              className="absolute right-4 top-4 text-brown-dark hover:text-brown transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-2xl font-serif font-bold text-brown mb-2">
              {editingExamSubject ? 'Edit Exam Details' : 'Schedule Exam'}
            </h3>
            <p className="text-xs text-brown-dark mb-4">
              Enter the details to add this exam to your personal timetable. This information will remain private.
            </p>

            <form onSubmit={handleSaveExam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brown-text mb-1">
                  Subject *
                </label>
                <select
                  required
                  disabled={!!editingExamSubject}
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-tan rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brown text-sm"
                >
                  <option value="">Select a subject...</option>
                  {subjects
                    .filter((sub) => !sub.exam_date || (editingExamSubject && editingExamSubject.id === sub.id))
                    .map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                </select>
                {subjects.filter((sub) => !sub.exam_date || (editingExamSubject && editingExamSubject.id === sub.id)).length === 0 && !editingExamSubject && (
                  <p className="text-xs text-red-600 mt-1">
                    No subjects available to schedule. Please add a subject in the Syllabus tab first.
                  </p>
                )}
              </div>

              <div>
                <Input
                  type="date"
                  label="Exam Date *"
                  required
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    type="time"
                    label="Exam Time"
                    value={examTime}
                    onChange={(e) => setExamTime(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    label="Total Marks"
                    min={0}
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Input
                  type="text"
                  label="Exam Venue"
                  placeholder="e.g., Hall A, Room 102"
                  value={examVenue}
                  onChange={(e) => setExamVenue(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowExamModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateSubjectMutation.isPending}
                >
                  {updateSubjectMutation.isPending ? 'Saving...' : 'Save Exam'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
