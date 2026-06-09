import { useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectsService } from '../../services/subjects.service';
import { Button } from '../ui/Button';
import { X, Check, Clock, RotateCcw } from 'lucide-react';

export default function TopicRow({ topicId, name, status, chapterId }) {
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: (newStatus) => subjectsService.updateTopicStatus(topicId, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics', chapterId] });
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: () => subjectsService.deleteTopic(topicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics', chapterId] });
    },
  });

  const statusOptions = [
    { value: 'not_started', label: 'Not Started', icon: '⭕' },
    { value: 'in_progress', label: 'In Progress', icon: '⏳' },
    { value: 'done', label: 'Done', icon: '✅' },
    { value: 'revision_needed', label: 'Revision Needed', icon: '🔄' },
  ];

  const currentStatus = statusOptions.find((s) => s.value === status);

  return (
    <div className="flex items-center justify-between p-2 bg-cream-100 rounded-lg hover:bg-cream-200 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <span className="text-lg">{currentStatus?.icon}</span>
        <span className="text-brown-text">{name}</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative group">
          <Button variant="ghost" size="sm" className="text-xs">
            {currentStatus?.label}
          </Button>
          <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg hidden group-hover:block z-10">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => statusMutation.mutate(option.value)}
                className="w-full text-left px-3 py-2 text-sm text-brown-text hover:bg-cream-100"
              >
                {option.icon} {option.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => deleteTopicMutation.mutate()}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
