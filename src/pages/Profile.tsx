import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Upload, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setDisplayName(data.display_name || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Math.random()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);

      toast({
        title: "Avatar uploaded",
        description: "Your avatar has been updated successfully",
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          display_name: displayName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully",
      });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error saving profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-xl font-mono">LOADING...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-4 border-border p-4">
        <div className="container mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-bold">MY PROFILE</h1>
        </div>
      </header>

      <main className="container mx-auto p-8">
        <Card className="max-w-2xl mx-auto p-8 border-4 border-border">
          <div className="space-y-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="w-32 h-32 border-4 border-border">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-4xl">
                  <User className="w-16 h-16" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex flex-col items-center gap-2">
                <Label htmlFor="avatar" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border-2 border-border bg-card hover:bg-accent transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>{uploading ? 'Uploading...' : 'Upload Avatar'}</span>
                  </div>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </Label>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG or GIF (max 5MB)
                </p>
              </div>
            </div>

            {/* Profile Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="border-2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="border-2"
                />
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSaveProfile}
              disabled={loading}
              className="w-full border-4 border-border"
              size="lg"
            >
              {loading ? 'SAVING...' : 'SAVE PROFILE'}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Profile;
