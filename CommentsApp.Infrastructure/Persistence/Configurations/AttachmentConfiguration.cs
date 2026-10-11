using CommentsApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CommentsApp.Infrastructure.Persistence.Configurations;

public class AttachmentConfiguration : IEntityTypeConfiguration<Attachment>
{
    public void Configure(EntityTypeBuilder<Attachment> entity)
    {
        entity.ToTable("attachments");
        entity.HasKey(e => e.Id);

        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.CommentId).HasColumnName("comment_id");
        entity.Property(e => e.FileName).HasColumnName("file_name").HasMaxLength(255).IsRequired();
        entity.Property(e => e.StoredPath).HasColumnName("stored_path").HasMaxLength(500).IsRequired();
        entity.Property(e => e.ContentType).HasColumnName("content_type").HasMaxLength(100).IsRequired();
        entity.Property(e => e.SizeBytes).HasColumnName("size_bytes");

        // enum AttachmentKind <-> строка 'image'/'text' в БД
        entity.Property(e => e.Kind)
            .HasColumnName("kind")
            .HasMaxLength(10)
            .HasConversion(
                v => v == AttachmentKind.Image ? "image" : "text",
                v => v == "image" ? AttachmentKind.Image : AttachmentKind.Text);

        entity.HasOne(e => e.Comment)
            .WithMany(e => e.Attachments)
            .HasForeignKey(e => e.CommentId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasIndex(e => e.CommentId, "idx_attachments_comment_id");
    }
}