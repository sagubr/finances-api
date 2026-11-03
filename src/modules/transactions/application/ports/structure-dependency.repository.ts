export interface IStructureDependencyRepository {
  hasAccountDependencies(publicId: string): Promise<boolean>;
  hasCategoryDependencies(publicId: string): Promise<boolean>;
}
