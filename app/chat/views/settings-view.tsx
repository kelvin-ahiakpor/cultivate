"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, MapPin, PanelLeft, Loader2, Check, AlertCircle, Bell, WifiOff } from "lucide-react";
import { GlassCircleButton } from "@/components/cultivate-ui";
import { InlineEditableText } from "@/components/inline-editable-text";
import { notify } from "@/lib/toast";
import { usePushNotifications } from "@/lib/hooks/use-push-notifications";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

interface SettingsViewProps {
  user: {
    id: string;
    name: string;
    email: string;
    location?: string | null;
    gpsCoordinates?: string | null;
  };
  sidebarOpen?: boolean;
  setSidebarOpen?: (value: boolean) => void;
  onBack?: () => void;
  onLocationUpdate?: (location: string, gpsCoordinates: string) => void;
}

export default function SettingsView({
  user,
  sidebarOpen = true,
  setSidebarOpen,
  onBack,
  onLocationUpdate
}: SettingsViewProps) {
  const isOnline = useOnlineStatus();
  const [displayName, setDisplayName] = useState(user.name || "");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(user.name || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [location, setLocation] = useState(user.location || "");
  const [gpsCoordinates, setGpsCoordinates] = useState(user.gpsCoordinates || "");
  const [editingLocationField, setEditingLocationField] = useState(false);
  const [editingGpsField, setEditingGpsField] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [supportsNotifications, setSupportsNotifications] = useState(false);
  const nameRef = useRef<HTMLDivElement | null>(null);
  const locationRef = useRef<HTMLDivElement | null>(null);
  const gpsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLocation(user.location || "");
    setGpsCoordinates(user.gpsCoordinates || "");
  }, [user.location, user.gpsCoordinates]);

  useEffect(() => {
    setDisplayName(user.name || "");
    setNameDraft(user.name || "");
  }, [user.name]);

  useEffect(() => {
    setSupportsNotifications(typeof window !== "undefined" && "Notification" in window);
  }, []);

  useEffect(() => {
    const target = editingName ? nameRef.current : editingLocationField ? locationRef.current : editingGpsField ? gpsRef.current : null;
    if (!target) return;
    target.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [editingName, editingLocationField, editingGpsField]);

  const handleSaveName = async () => {
    const trimmedName = nameDraft.trim();
    if (!trimmedName) {
      notify.error("Name cannot be empty");
      return;
    }

    if (trimmedName === displayName) {
      setEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      const response = await fetch("/api/user/location", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          location: location.trim() || null,
          gpsCoordinates: gpsCoordinates.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save name");
      }

      setDisplayName(trimmedName);
      setNameDraft(trimmedName);
      setEditingName(false);
      notify.success("Name updated");
    } catch (error) {
      console.error("Save name error:", error);
      notify.error("Failed to save name");
    } finally {
      setIsSavingName(false);
    }
  };

  const persistLocation = async (nextLocation: string, nextGpsCoordinates: string) => {
    if (!nextLocation.trim() && !nextGpsCoordinates.trim()) {
      notify.error("Please enter a location or detect your current location");
      return false;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/user/location", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: nextLocation.trim() || null,
          gpsCoordinates: nextGpsCoordinates.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save location");
      }

      notify.success("Location updated");
      onLocationUpdate?.(nextLocation.trim(), nextGpsCoordinates.trim());
      return true;
    } catch (error) {
      console.error("Save location error:", error);
      notify.error("Failed to save location");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      notify.error("Geolocation is not supported by your browser");
      return;
    }

    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(4);
        const lon = position.coords.longitude.toFixed(4);
        const coords = `${lat},${lon}`;
        let nextLocation = `Location: ${coords}`;

        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
          );
          const data = await response.json();
          const cityName = data.city || data.locality || data.principalSubdivision || "Unknown location";
          const country = data.countryName || "";
          nextLocation = `${cityName}${country ? `, ${country}` : ""}`;
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
        }

        setGpsCoordinates(coords);
        setLocation(nextLocation);
        setIsDetecting(false);
        await persistLocation(nextLocation, coords);
      },
      (error) => {
        setIsDetecting(false);
        if (error.code === error.PERMISSION_DENIED) {
          notify.error("Location permission denied");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          notify.error("Location unavailable");
        } else if (error.code === error.TIMEOUT) {
          notify.error("Location request timed out");
        } else {
          notify.error("Failed to detect location");
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 300000,
      }
    );
  };

  const handleSaveLocationField = async () => {
    const nextLocation = location.trim();
    if (nextLocation === (user.location || "").trim()) {
      setEditingLocationField(false);
      return;
    }
    const success = await persistLocation(nextLocation, gpsCoordinates);
    if (success) setEditingLocationField(false);
  };

  const handleSaveGpsField = async () => {
    const nextGpsCoordinates = gpsCoordinates.trim();
    if (nextGpsCoordinates === (user.gpsCoordinates || "").trim()) {
      setEditingGpsField(false);
      return;
    }
    const success = await persistLocation(location, nextGpsCoordinates);
    if (success) setEditingGpsField(false);
  };

  const { permission, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0">
        <div className="lg:hidden relative flex items-center justify-center pt-8 pb-4 mb-6">
          <div className="absolute left-0">
            {setSidebarOpen && (
              <GlassCircleButton onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                <PanelLeft className="w-5 h-5 text-white rotate-180" />
              </GlassCircleButton>
            )}
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-serif text-cultivate-text-primary">Settings</h1>
              {!isOnline && <WifiOff className="w-4 h-4 text-cultivate-text-tertiary" />}
            </div>
            <p className="text-sm text-cultivate-text-secondary mt-1">Manage your account preferences</p>
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-serif text-cultivate-text-primary">Settings</h1>
              {!isOnline && <WifiOff className="w-4 h-4 text-cultivate-text-tertiary" />}
            </div>
            <p className="text-sm text-cultivate-text-secondary mt-1">Manage your account preferences</p>
          </div>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        <div className="h-full overflow-y-auto thin-scrollbar scrollbar-outset">
          <div className="w-full pb-8 lg:max-w-2xl lg:mx-auto">
            <div className="bg-cultivate-bg-elevated border border-cultivate-border-element rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-cultivate-bg-hover rounded-lg">
                  <MapPin className="w-5 h-5 text-cultivate-green-light" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-medium text-cultivate-text-primary mb-1">Location</h2>
                  <p className="text-sm text-cultivate-text-secondary">
                    Set your farming location to receive tailored agricultural advice for your region
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleDetectLocation}
                  disabled={isDetecting || isSaving}
                  className="flex items-center gap-2 text-sm text-cultivate-text-secondary hover:text-white transition-colors disabled:opacity-40"
                >
                  {isDetecting || isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isDetecting ? "Detecting location..." : "Saving..."}</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4" />
                      <span>Detect current location</span>
                    </>
                  )}
                </button>

                <div>
                  <label className="block text-xs text-cultivate-text-tertiary mb-1">City/Region</label>
                  <InlineEditableText
                    value={location}
                    editing={editingLocationField}
                    isSaving={isSaving}
                    onStartEdit={() => setEditingLocationField(true)}
                    onChange={setLocation}
                    onConfirm={handleSaveLocationField}
                    onCancel={() => {
                      setLocation(user.location || "");
                      setEditingLocationField(false);
                    }}
                    buttonAriaLabel="Edit location"
                    inputRef={locationRef}
                    displayClassName="text-sm text-cultivate-text-primary"
                    editorClassName="min-w-0 bg-transparent p-0 m-0 text-sm text-cultivate-text-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-cultivate-text-tertiary mb-1">GPS Coordinates</label>
                  <InlineEditableText
                    value={gpsCoordinates}
                    editing={editingGpsField}
                    isSaving={isSaving}
                    onStartEdit={() => setEditingGpsField(true)}
                    onChange={setGpsCoordinates}
                    onConfirm={handleSaveGpsField}
                    onCancel={() => {
                      setGpsCoordinates(user.gpsCoordinates || "");
                      setEditingGpsField(false);
                    }}
                    buttonAriaLabel="Edit GPS coordinates"
                    inputRef={gpsRef}
                    displayClassName="text-sm text-cultivate-text-primary"
                    editorClassName="min-w-0 bg-transparent p-0 m-0 text-sm text-cultivate-text-primary outline-none"
                  />
                </div>

                <div className="flex items-start gap-2 p-3 bg-cultivate-bg-hover rounded-lg">
                  <AlertCircle className="w-4 h-4 text-cultivate-teal mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-cultivate-text-secondary">
                    Your location helps the AI provide region-specific advice about planting seasons, pest management, and weather conditions
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-cultivate-bg-elevated border border-cultivate-border-element rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-cultivate-bg-hover rounded-lg">
                  <Settings className="w-5 h-5 text-cultivate-green-light" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-medium text-cultivate-text-primary mb-1">Account Information</h2>
                  <p className="text-sm text-cultivate-text-secondary">Your profile details</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-cultivate-text-tertiary mb-1">Name</label>
                  <InlineEditableText
                    value={nameDraft}
                    editing={editingName}
                    isSaving={isSavingName}
                    onStartEdit={() => setEditingName(true)}
                    onChange={setNameDraft}
                    onConfirm={handleSaveName}
                    onCancel={() => {
                      setNameDraft(displayName);
                      setEditingName(false);
                    }}
                    buttonAriaLabel="Edit name"
                    inputRef={nameRef}
                    displayClassName="text-sm text-cultivate-text-primary"
                    editorClassName="min-w-0 bg-transparent p-0 m-0 text-sm text-cultivate-text-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-cultivate-text-tertiary mb-1">Email</label>
                  <p className="text-sm text-cultivate-text-primary">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Notifications */}
            {supportsNotifications && (
              <div className="mt-6 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-cultivate-bg-hover rounded-lg">
                    <Bell className="w-4 h-4 text-cultivate-teal" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-medium text-cultivate-text-primary mb-1">Notifications</h2>
                    <p className="text-sm text-cultivate-text-secondary">
                      Get notified when your question gets a response from an agronomist.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    {permission === "denied" ? (
                      <p className="text-xs text-cultivate-text-tertiary">Notifications blocked in browser settings.</p>
                    ) : isSubscribed ? (
                      <p className="text-xs text-cultivate-green-light flex items-center gap-1">
                        <Check className="w-3 h-3" /> Notifications enabled
                      </p>
                    ) : (
                      <p className="text-xs text-cultivate-text-tertiary">Push notifications are off.</p>
                    )}
                  </div>
                  {permission !== "denied" && (
                    <button
                      onClick={isSubscribed ? unsubscribe : subscribe}
                      disabled={pushLoading}
                      className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-cultivate-bg-hover border border-cultivate-border-element text-cultivate-text-primary hover:border-cultivate-green-light"
                    >
                      {pushLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isSubscribed ? "Turn off" : "Turn on"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
