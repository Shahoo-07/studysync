import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSubjectsStore } from '../store/subjects';
import { subjectsService } from '../services/subjects.service';
import Navbar from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import SubjectCard from '../components/syllabus/SubjectCard';
import TopicRow from '../components/syllabus/TopicRow';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';

export default function Home() {
  const queryClient = useQueryClient();
  const subjects = useSubjectsStore((state) => state.subjects);
  const setSubjects = useSubjectsStore((state) => state.setSubjects);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [newSubjectName, setNewSubjectName] = useState('');
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#FFADAD');

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

  const handleCreateSubject = () => {
    if (newSubjectName.trim()) {
      createSubjectMutation.mutate({
        name: newSubjectName,
        color: selectedColor,
      });
    }
  };

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
    <div className="min-h-screen bg-cream-50">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-brown mb-2">
            Your Syllabus
          </h1>
          <p className="text-brown-dark">
            Build your study plan by adding subjects, chapters, and topics
          </p>
        </div>

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
          <div className="card mb-6">
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
          <div className="card text-center py-12">
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
              <div key={subject.id} className="card">
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
    </div>
  );
}
