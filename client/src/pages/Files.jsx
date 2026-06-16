import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { filesService } from '../services/files.service';
import { friendsService } from '../services/friends.service';
import { subjectsService } from '../services/subjects.service';
import { groupsService } from '../services/groups.service';
import Navbar from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import api from '../services/api';
import {
  Folder,
  File,
  UploadCloud,
  Share2,
  Download,
  Trash2,
  Plus,
  ChevronRight,
  FolderPlus,
  ArrowLeft,
  Users,
  HardDrive,
  Info,
  Clock,
  X
} from 'lucide-react';
import { format } from 'date-fns';

export default function Files() {
  const queryClient = useQueryClient();
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [currentFolderName, setCurrentFolderName] = useState('My Drive');
  const [folderHistory, setFolderHistory] = useState([]); // Array of { id, name }
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  // Share Modal State
  const [sharingFile, setSharingFile] = useState(null); // File object currently sharing
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [sharePermission, setSharePermission] = useState('view');
  const [shareSuccess, setShareSuccess] = useState('');
  
  // Upload States
  const [linkedSubjectId, setLinkedSubjectId] = useState('');
  const [fileDescription, setFileDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);

  // Tab filter: 'my-drive' | 'shared-with-me'
  const [activeTab, setActiveTab] = useState('my-drive');

  // Fetch folders
  const { data: allFolders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: () => filesService.getFolders().then((r) => r.data),
    enabled: activeTab === 'my-drive',
  });

  // Fetch files in current folder
  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['files', currentFolderId, activeTab],
    queryFn: () => {
      if (activeTab === 'shared-with-me') {
        return filesService.getSharedFiles().then((r) => r.data);
      }
      return filesService.getFiles(currentFolderId).then((r) => r.data);
    },
  });

  // Fetch subjects (to tag files)
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsService.getSubjects().then((r) => r.data),
  });

  // Fetch friends list (for sharing)
  const { data: friendships = [] } = useQuery({
    queryKey: ['friends'],
    queryFn: () => friendsService.getFriends().then((r) => r.data),
  });
  const friends = friendships.filter((f) => f.status === 'accepted');

  // Fetch groups (for sharing)
  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsService.getGroups().then((r) => r.data),
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: (name) => filesService.createFolder(name, currentFolderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setNewFolderName('');
      setShowFolderModal(false);
    },
  });

  // Share file mutation
  const shareFileMutation = useMutation({
    mutationFn: ({ fileId, userIds, groupIds, permission }) =>
      filesService.shareFile(fileId, userIds, groupIds, permission),
    onSuccess: () => {
      setShareSuccess('File shared successfully!');
      setSelectedFriendIds([]);
      setSelectedGroupIds([]);
      setTimeout(() => {
        setShareSuccess('');
        setSharingFile(null);
      }, 2000);
    },
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: (id) => filesService.deleteFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId, activeTab] });
    },
  });

  // File download handler (AJAX Blob logic to pass JWT Bearer token)
  const handleDownload = async (fileId, originalName) => {
    try {
      const response = await api.get(`/files/${fileId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Update files list to increment download counts
      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId, activeTab] });
    } catch (err) {
      console.error('File download error:', err);
      alert('Failed to download file. You may not have download permissions.');
    }
  };

  // react-dropzone config
  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    
    setUploadProgress('Uploading...');
    try {
      await filesService.uploadFile(
        file,
        linkedSubjectId || null,
        currentFolderId || null,
        fileDescription || null
      );
      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId, activeTab] });
      setFileDescription('');
      setLinkedSubjectId('');
      setUploadProgress('Upload complete!');
      setTimeout(() => setUploadProgress(null), 2500);
    } catch (err) {
      console.error('Upload error:', err);
      setUploadProgress('Upload failed. Check size (max 50MB).');
      setTimeout(() => setUploadProgress(null), 4000);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false
  });

  // Navigate folder tree
  const handleFolderClick = (folder) => {
    setFolderHistory((prev) => [...prev, { id: currentFolderId, name: currentFolderName }]);
    setCurrentFolderId(folder.id);
    setCurrentFolderName(folder.name);
  };

  const handleBackClick = () => {
    if (folderHistory.length === 0) return;
    const previous = folderHistory[folderHistory.length - 1];
    setFolderHistory((prev) => prev.slice(0, -1));
    setCurrentFolderId(previous.id);
    setCurrentFolderName(previous.name);
  };

  const handleCreateFolderSubmit = (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    createFolderMutation.mutate(newFolderName.trim());
  };

  // Format bytes helper
  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Subfolders of current folder
  const currentFolders = allFolders.filter((f) => f.parent_folder_id === currentFolderId);

  const toggleFriendSelect = (friendId) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const toggleGroupSelect = (groupId) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  return (
    <div className="min-h-screen bg-cream-50 text-brown-text font-sans">
      <Navbar />

      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-brown mb-2">
            Study Files
          </h1>
          <p className="text-brown-dark">
            Upload notes, lecture slides, and share them with friends
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Left Panel: Sidebar Tree */}
          <div className="space-y-4">
            <div className="card border border-tan bg-white p-4 shadow-sm space-y-2">
              <button
                onClick={() => {
                  setActiveTab('my-drive');
                  setCurrentFolderId(null);
                  setCurrentFolderName('My Drive');
                  setFolderHistory([]);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'my-drive'
                    ? 'bg-brown text-white'
                    : 'text-brown hover:bg-cream-100'
                }`}
              >
                <HardDrive className="w-4.5 h-4.5" />
                My Drive
              </button>

              <button
                onClick={() => setActiveTab('shared-with-me')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'shared-with-me'
                    ? 'bg-brown text-white'
                    : 'text-brown hover:bg-cream-100'
                }`}
              >
                <Users className="w-4.5 h-4.5" />
                Shared with me
              </button>
            </div>

            {/* Folder creation CTA (Only for My Drive tab) */}
            {activeTab === 'my-drive' && (
              <Button
                variant="outline"
                onClick={() => setShowFolderModal(true)}
                className="w-full flex items-center justify-center text-xs"
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                New Folder
              </Button>
            )}
          </div>

          {/* Right Panel: File and Folder Grid */}
          <div className="md:col-span-3 space-y-6">
            {/* Navigation Path Breadcrumbs */}
            {activeTab === 'my-drive' && (
              <div className="flex items-center gap-2 text-sm text-brown-dark">
                {folderHistory.length > 0 && (
                  <button
                    onClick={handleBackClick}
                    className="p-1 hover:bg-cream-200 rounded text-brown transition-colors flex items-center gap-1 text-xs font-semibold mr-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </button>
                )}
                <span className="font-serif font-bold text-brown text-lg">
                  {currentFolderName}
                </span>
              </div>
            )}

            {/* Upload Zone (Only in My Drive) */}
            {activeTab === 'my-drive' && (
              <div className="card border border-tan bg-white p-6 shadow-sm space-y-4">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center ${
                    isDragActive
                      ? 'border-brown bg-cream-50'
                      : 'border-tan hover:border-brown hover:bg-cream-50/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <UploadCloud className="w-12 h-12 text-brown mb-3" />
                  <p className="text-sm font-semibold text-brown">
                    Drag & drop study file here, or click to browse
                  </p>
                  <p className="text-xs text-brown-dark/70 mt-1">
                    PDF, DOCX, PPTX, Images (Max 50MB)
                  </p>
                </div>

                {/* Upload metadata attachments */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase font-bold text-brown-dark mb-1">
                      Link to Subject (Optional)
                    </label>
                    <select
                      value={linkedSubjectId}
                      onChange={(e) => setLinkedSubjectId(e.target.value)}
                      className="w-full px-2 py-1.5 border border-tan rounded-lg text-xs bg-cream-50 focus:ring-1 focus:ring-brown focus:outline-none"
                    >
                      <option value="">Select subject...</option>
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-brown-dark mb-1">
                      File Description
                    </label>
                    <Input
                      placeholder="e.g., Chapter 1 summary notes"
                      value={fileDescription}
                      onChange={(e) => setFileDescription(e.target.value)}
                      className="!py-1 !px-2 text-xs"
                    />
                  </div>
                </div>

                {uploadProgress && (
                  <div className="text-xs text-center font-semibold text-brown mt-2">
                    {uploadProgress}
                  </div>
                )}
              </div>
            )}

            {/* Grid listings of Folders and Files */}
            <div className="space-y-6">
              {/* Subfolders grid */}
              {activeTab === 'my-drive' && currentFolders.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase font-bold text-brown-dark tracking-wider mb-2">
                    Folders
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {currentFolders.map((folder) => (
                      <div
                        key={folder.id}
                        onClick={() => handleFolderClick(folder)}
                        className="flex items-center gap-2.5 p-3 rounded-lg border border-tan bg-white shadow-sm hover:bg-cream-100/50 cursor-pointer transition-colors"
                      >
                        <Folder className="w-5 h-5 text-brown fill-current" />
                        <span className="text-sm font-semibold truncate text-brown-text">
                          {folder.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files list */}
              <div>
                <h4 className="text-xs uppercase font-bold text-brown-dark tracking-wider mb-2">
                  Files
                </h4>

                {filesLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((n) => (
                      <div key={n} className="h-14 bg-cream-100 rounded animate-pulse" />
                    ))}
                  </div>
                ) : files.length === 0 ? (
                  <div className="card text-center py-10 border border-dashed border-tan">
                    <File className="w-10 h-10 text-tan mx-auto mb-2" />
                    <p className="text-sm text-brown font-semibold">No files inside this directory</p>
                    <p className="text-xs text-brown-dark mt-1">
                      {activeTab === 'my-drive' ? 'Upload files to start sharing.' : 'No files have been shared with you yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-tan overflow-hidden shadow-sm">
                    <div className="divide-y divide-tan">
                      {files.map((file) => {
                        const subjectColor = subjects.find(s => s.id === file.subject_id)?.color;
                        return (
                          <div
                            key={file.id}
                            className="p-4 flex items-center justify-between hover:bg-cream-50/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-lg bg-cream-100 flex items-center justify-center border border-tan flex-shrink-0">
                                <File className="w-5.5 h-5.5 text-brown" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-brown-text truncate" title={file.original_name}>
                                  {file.original_name}
                                </p>
                                <div className="flex items-center flex-wrap gap-2 text-[10px] text-brown-dark mt-1">
                                  <span>{formatBytes(file.size_bytes)}</span>
                                  <span>&bull;</span>
                                  <span>Uploaded {format(new Date(file.created_at), 'MMM dd, yyyy')}</span>
                                  {file.uploaderName && (
                                    <>
                                      <span>&bull;</span>
                                      <span className="font-semibold text-brown">By {file.uploaderName}</span>
                                    </>
                                  )}
                                  {file.download_count > 0 && (
                                    <>
                                      <span>&bull;</span>
                                      <span>{file.download_count} download{file.download_count !== 1 ? 's' : ''}</span>
                                    </>
                                  )}
                                  {subjectColor && (
                                    <div
                                      className="w-2 h-2 rounded-full ml-1"
                                      style={{ backgroundColor: subjectColor }}
                                      title="Linked subject"
                                    />
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 ml-4">
                              <button
                                onClick={() => handleDownload(file.id, file.original_name)}
                                className="p-2 text-brown hover:bg-cream-100 rounded-lg transition-colors"
                                title="Download File"
                              >
                                <Download className="w-4 h-4" />
                              </button>

                              {activeTab === 'my-drive' && (
                                <>
                                  <button
                                    onClick={() => setSharingFile(file)}
                                    className="p-2 text-brown hover:bg-cream-100 rounded-lg transition-colors"
                                    title="Share File"
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('Are you sure you want to delete this file?')) {
                                        deleteFileMutation.mutate(file.id);
                                      }
                                    }}
                                    className="p-2 text-tan hover:text-red-700 hover:bg-cream-100 rounded-lg transition-colors"
                                    title="Delete File"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-cream-50 rounded-xl border border-tan shadow-xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setShowFolderModal(false)}
              className="absolute right-4 top-4 text-brown-dark hover:text-brown transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-serif font-bold text-brown mb-4">
              Create New Folder
            </h3>
            <form onSubmit={handleCreateFolderSubmit} className="space-y-4">
              <Input
                required
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFolderModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createFolderMutation.isPending}
                >
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share File Modal */}
      {sharingFile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-cream-50 rounded-xl border border-tan shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setSharingFile(null);
                setSelectedFriendIds([]);
                setSelectedGroupIds([]);
              }}
              className="absolute right-4 top-4 text-brown-dark hover:text-brown transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-2xl font-serif font-bold text-brown mb-1">
              Share Study File
            </h3>
            <p className="text-xs text-brown-dark mb-4 truncate">
              Sharing: {sharingFile.original_name}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold text-brown-dark mb-1">
                  Choose Share Permission
                </label>
                <div className="flex gap-2">
                  {['view', 'download'].map((perm) => (
                    <button
                      key={perm}
                      type="button"
                      onClick={() => setSharePermission(perm)}
                      className={`flex-1 text-xs py-2 rounded-lg border font-semibold ${
                        sharePermission === perm
                          ? 'bg-brown text-white border-brown'
                          : 'bg-white text-brown-text border-tan hover:bg-cream-100'
                      } transition-colors uppercase`}
                    >
                      {perm}
                    </button>
                  ))}
                </div>
              </div>

              {/* Share with Friends */}
              <div>
                <label className="block text-xs uppercase font-bold text-brown-dark mb-1.5">
                  Select Friends to Share With
                </label>
                {friends.length === 0 ? (
                  <p className="text-[10px] text-brown-dark py-1.5 text-center border border-dashed border-tan rounded bg-white">
                    No friends accepted.
                  </p>
                ) : (
                  <div className="max-h-28 overflow-y-auto border border-tan rounded-lg bg-white p-2 divide-y divide-tan">
                    {friends.map((friend) => {
                      const isSelected = selectedFriendIds.includes(friend.friendId);
                      return (
                        <div
                          key={friend.friendId}
                          onClick={() => toggleFriendSelect(friend.friendId)}
                          className={`flex items-center justify-between p-1.5 hover:bg-cream-50 cursor-pointer rounded transition-colors ${
                            isSelected ? 'bg-cream-100' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6.5 h-6.5 rounded-full bg-cream-200 flex items-center justify-center font-bold text-brown text-[10px] border border-tan">
                              {friend.name[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-brown-text leading-tight">{friend.name}</p>
                              <p className="text-[9px] text-brown-dark/80 leading-none">{friend.email}</p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded text-brown focus:ring-brown border-tan cursor-pointer w-3.5 h-3.5"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Share with Groups */}
              <div>
                <label className="block text-xs uppercase font-bold text-brown-dark mb-1.5">
                  Select Groups to Share With
                </label>
                {groups.length === 0 ? (
                  <p className="text-[10px] text-brown-dark py-1.5 text-center border border-dashed border-tan rounded bg-white">
                    No study groups joined.
                  </p>
                ) : (
                  <div className="max-h-28 overflow-y-auto border border-tan rounded-lg bg-white p-2 divide-y divide-tan">
                    {groups.map((group) => {
                      const isSelected = selectedGroupIds.includes(group.id);
                      return (
                        <div
                          key={group.id}
                          onClick={() => toggleGroupSelect(group.id)}
                          className={`flex items-center justify-between p-1.5 hover:bg-cream-50 cursor-pointer rounded transition-colors ${
                            isSelected ? 'bg-cream-100' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6.5 h-6.5 rounded bg-cream-200 flex items-center justify-center font-bold text-brown text-[10px] border border-tan">
                              G
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-brown-text leading-tight">{group.name}</p>
                              <p className="text-[9px] text-brown-dark/80 leading-none">{group.memberCount} members</p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded text-brown focus:ring-brown border-tan cursor-pointer w-3.5 h-3.5"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {shareSuccess && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 p-2 rounded-lg">
                  {shareSuccess}
                </p>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSharingFile(null);
                    setSelectedFriendIds([]);
                    setSelectedGroupIds([]);
                  }}
                >
                  Close
                </Button>
                <Button
                  disabled={shareFileMutation.isPending || (selectedFriendIds.length === 0 && selectedGroupIds.length === 0)}
                  onClick={() =>
                    shareFileMutation.mutate({
                      fileId: sharingFile.id,
                      userIds: selectedFriendIds,
                      groupIds: selectedGroupIds,
                      permission: sharePermission,
                    })
                  }
                >
                  {shareFileMutation.isPending ? 'Sharing...' : 'Share File'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
