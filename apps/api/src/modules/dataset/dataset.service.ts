import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { DATASETS, DatasetDefinition } from './dataset.seed';

@Injectable()
export class DatasetService {
  private downloadTableReady = false;

  constructor(private readonly dataSource: DataSource) {}

  private async ensureDownloadTable() {
    if (this.downloadTableReady) return;
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS dataset_downloads (
        id varchar(36) PRIMARY KEY,
        user_id varchar(36) NOT NULL,
        dataset_id varchar(80) NOT NULL,
        filename varchar(160) NOT NULL,
        content_type varchar(120) NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.dataSource.query('CREATE INDEX IF NOT EXISTS idx_dataset_downloads_user ON dataset_downloads(user_id, created_at)');
    this.downloadTableReady = true;
  }

  findAll() {
    return {
      items: DATASETS.map((dataset) => this.withoutRows(dataset)),
      total: DATASETS.length,
      summary: {
        rows: DATASETS.reduce((sum, dataset) => sum + dataset.rows, 0),
        users: DATASETS.reduce((sum, dataset) => sum + dataset.stats.users, 0),
      },
    };
  }

  async listDownloads(userId: string) {
    await this.ensureDownloadTable();
    const rows = await this.dataSource.query(
      'SELECT * FROM dataset_downloads WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId],
    ) as Array<{
      id: string;
      user_id: string;
      dataset_id: string;
      filename: string;
      content_type: string;
      created_at: string;
    }>;
    return {
      items: rows.map((row) => ({
        id: row.id,
        datasetId: row.dataset_id,
        filename: row.filename,
        contentType: row.content_type,
        createdAt: row.created_at,
      })),
      total: rows.length,
    };
  }

  async recordDownload(userId: string, datasetId: string, file: { filename: string; contentType: string }) {
    await this.ensureDownloadTable();
    await this.dataSource.query(
      'INSERT INTO dataset_downloads (id, user_id, dataset_id, filename, content_type) VALUES (?, ?, ?, ?, ?)',
      [randomUUID(), userId, datasetId, file.filename, file.contentType],
    );
  }

  findOne(id: string) {
    return this.withoutRows(this.getDataset(id));
  }

  preview(id: string, limit = 20) {
    const dataset = this.getDataset(id);
    return {
      dataset: this.withoutRows(dataset),
      rows: dataset.sampleRows.slice(0, Math.max(1, Math.min(limit, 100))),
    };
  }

  download(id: string) {
    const dataset = this.getDataset(id);
    if (dataset.format === 'JSON') {
      return {
        filename: `${dataset.id}.json`,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(dataset.sampleRows, null, 2),
      };
    }

    const header = dataset.columns.join(',');
    const rows = dataset.sampleRows.map((row) =>
      dataset.columns.map((column) => JSON.stringify(row[column] ?? '')).join(','),
    );
    return {
      filename: `${dataset.id}.csv`,
      contentType: 'text/csv; charset=utf-8',
      body: [header, ...rows].join('\n'),
    };
  }

  private getDataset(id: string): DatasetDefinition {
    const dataset = DATASETS.find((item) => item.id === id);
    if (!dataset) throw new NotFoundException('数据集不存在');
    return dataset;
  }

  private withoutRows(dataset: DatasetDefinition) {
    const { sampleRows, ...meta } = dataset;
    return meta;
  }
}
