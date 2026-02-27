import { RefObject } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

interface PhotoSectionProps {
  photos: { storageId: Id<"_storage">; url: string }[];
  roomName: string;
  roomId: Id<"rooms">;
  uploading: boolean;
  uploadProgress: { current: number; total: number };
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (args: { roomId: Id<"rooms">; storageId: Id<"_storage"> }) => void;
}

export function PhotoSection({
  photos,
  roomName,
  roomId,
  uploading,
  uploadProgress,
  fileInputRef,
  onFileUpload,
  onRemovePhoto,
}: PhotoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span>Photos</span>
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading
              ? uploadProgress.total > 1
                ? `Uploading ${uploadProgress.current}/${uploadProgress.total}`
                : "Uploading..."
              : "Add Photos"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onFileUpload}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {photos.length === 0 ? (
          <div
            className="aspect-video bg-surface-inset rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-center text-text-quaternary">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <p>Click to upload photos</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="aspect-video bg-surface-inset rounded-lg overflow-hidden relative group">
              <Image
                src={photos[0].url}
                alt={roomName}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 33vw"
                priority
              />
              <RemoveButton onClick={() => onRemovePhoto({ roomId, storageId: photos[0].storageId })} />
            </div>
            {photos.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.slice(1).map((photo) => (
                  <div key={photo.storageId} className="aspect-square bg-surface-inset rounded overflow-hidden relative group">
                    <Image
                      src={photo.url}
                      alt={`${roomName} photo`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 33vw, 11vw"
                    />
                    <RemoveButton onClick={() => onRemovePhoto({ roomId, storageId: photo.storageId })} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
      onClick={onClick}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}
