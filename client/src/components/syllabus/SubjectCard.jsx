import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectsService } from '../../services/subjects.service';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import ChapterAccordion from './ChapterAccordion';
import { Plus, X } from 'lucide-react';

export default function SubjectCard({ subjectId }) {
  const queryClient = useQueryClient();
  const [newChapterName, setNewChapterName] = useState('');
  const [showNewChapter, setShowNewChapter] = useState(false);

  const { data: chapters = [] } = useQuery({
    queryKey: ['chapters', subjectId],
    queryFn: async () => {
      const response = await subjectsService.getChapters(subjectId);
      return response.data;
    },
  });

  const createChapterMutation = useMutation({
    mutationFn: (name) => subjectsService.createChapter(subjectId, name),
    onSuccess: () => {
      setNewChapterName('');
      setShowNewChapter(false);
      queryClient.invalidateQueries({ queryKey: ['chapters', subjectId] });
    },
  });

  const deleteChapterMutation = useMutation({
    mutationFn: (id) => subjectsService.deleteChapter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', subjectId] });
    },
  });

  const handleCreateChapter = () => {
    if (newChapterName.trim()) {
      createChapterMutation.mutate(newChapterName);
    }
  };

  return (
    <div className="pl-8 space-y-3">
      {!showNewChapter ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowNewChapter(true)}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Chapter
        </Button>
      ) : (
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Chapter name"
            value={newChapterName}
            onChange={(e) => setNewChapterName(e.target.value)}
          />
          <Button
            size="sm"
            onClick={handleCreateChapter}
            disabled={createChapterMutation.isPending}
          >
            Add
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewChapter(false)}
          >
            Cancel
          </Button>
        </div>
      )}

      {chapters.map((chapter) => (
        <div key={chapter.id} className="border-l-2 border-tan pl-4">
          <div className="flex items-center justify-between">
            <ChapterAccordion chapterId={chapter.id} name={chapter.name} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteChapterMutation.mutate(chapter.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
