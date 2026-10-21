import { ApiProperty } from '@nestjs/swagger';
import { DocumentFolder } from '../../domain/document-folder.entity';

export class DocumentFolderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Licenças ambientais' })
  name!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  parent_id!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at!: string;
}

export function toDocumentFolderResponse(
  folder: DocumentFolder,
): DocumentFolderResponseDto {
  return {
    id: folder.id,
    name: folder.name,
    parent_id: folder.parentId,
    created_at: folder.createdAt.toISOString(),
  };
}
