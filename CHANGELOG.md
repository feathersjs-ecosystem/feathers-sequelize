# Change Log

## [v2.3.0](https://github.com/feathersjs/feathers-sequelize/tree/v2.3.0) (2017-08-19)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v2.2.1...v2.3.0)

**Closed issues:**

- use inside php server [\#151](https://github.com/feathersjs/feathers-sequelize/issues/151)
- Patch returns Model instance by default [\#146](https://github.com/feathersjs/feathers-sequelize/issues/146)
- Run tests against PostgreSQL [\#105](https://github.com/feathersjs/feathers-sequelize/issues/105)
- Avoid findAndCount if paginate is false [\#95](https://github.com/feathersjs/feathers-sequelize/issues/95)

**Merged pull requests:**

- Finalize running tests against Postgresql [\#152](https://github.com/feathersjs/feathers-sequelize/pull/152) ([daffl](https://github.com/daffl))
- Fix postgres tests [\#150](https://github.com/feathersjs/feathers-sequelize/pull/150) ([Ryanthegiantlion](https://github.com/Ryanthegiantlion))

## [v2.2.1](https://github.com/feathersjs/feathers-sequelize/tree/v2.2.1) (2017-08-08)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v2.2.0...v2.2.1)

**Closed issues:**

- All service methods should take into account the query parameter [\#143](https://github.com/feathersjs/feathers-sequelize/issues/143)

**Merged pull requests:**

- Patch should default to raw queries [\#147](https://github.com/feathersjs/feathers-sequelize/pull/147) ([Ryanthegiantlion](https://github.com/Ryanthegiantlion))
- Fixing broken docs links [\#144](https://github.com/feathersjs/feathers-sequelize/pull/144) ([corymsmith](https://github.com/corymsmith))

## [v2.2.0](https://github.com/feathersjs/feathers-sequelize/tree/v2.2.0) (2017-07-24)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v2.1.0...v2.2.0)

**Closed issues:**

- Is there any full example about database relationship? [\#141](https://github.com/feathersjs/feathers-sequelize/issues/141)
- Query fails when using the $contains operator with a single value [\#135](https://github.com/feathersjs/feathers-sequelize/issues/135)
- Allow scope\(\) to be used for operations [\#130](https://github.com/feathersjs/feathers-sequelize/issues/130)

**Merged pull requests:**

- Adding ability to scope operations [\#142](https://github.com/feathersjs/feathers-sequelize/pull/142) ([bparise](https://github.com/bparise))

## [v2.1.0](https://github.com/feathersjs/feathers-sequelize/tree/v2.1.0) (2017-07-13)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v2.0.1...v2.1.0)

**Closed issues:**

- Hydrate is not compatible with Sequelize 4.x [\#138](https://github.com/feathersjs/feathers-sequelize/issues/138)
- Update only one parameter in row [\#136](https://github.com/feathersjs/feathers-sequelize/issues/136)
- Hook Includes not working [\#134](https://github.com/feathersjs/feathers-sequelize/issues/134)
- Hydrate not being exported correctly [\#133](https://github.com/feathersjs/feathers-sequelize/issues/133)
- An in-range update of feathers-rest is breaking the build 🚨 [\#132](https://github.com/feathersjs/feathers-sequelize/issues/132)
- No record found [\#128](https://github.com/feathersjs/feathers-sequelize/issues/128)
- many to many \(through model, with extra field in junction table\) error "\<Model1\> is not associated to \<Model2\>" [\#126](https://github.com/feathersjs/feathers-sequelize/issues/126)
- find total is always zero when raw is false [\#118](https://github.com/feathersjs/feathers-sequelize/issues/118)
- N:N relation using React Native [\#109](https://github.com/feathersjs/feathers-sequelize/issues/109)

**Merged pull requests:**

- Add compatibility for documented hydration hook imports [\#140](https://github.com/feathersjs/feathers-sequelize/pull/140) ([daffl](https://github.com/daffl))
- fix\(hydrate\): Fix the factory function so that Sequelize 4.x is supported [\#139](https://github.com/feathersjs/feathers-sequelize/pull/139) ([dschnare](https://github.com/dschnare))
- Update sequelize to the latest version 🚀 [\#123](https://github.com/feathersjs/feathers-sequelize/pull/123) ([greenkeeper[bot]](https://github.com/apps/greenkeeper))

## [v2.0.1](https://github.com/feathersjs/feathers-sequelize/tree/v2.0.1) (2017-06-09)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v2.0.0...v2.0.1)

**Closed issues:**

- Allow custom primary keys [\#122](https://github.com/feathersjs/feathers-sequelize/issues/122)
- Investigate issue where getters, setters not being called [\#116](https://github.com/feathersjs/feathers-sequelize/issues/116)
- Model.create ignoring field and virtual setters [\#113](https://github.com/feathersjs/feathers-sequelize/issues/113)
- An in-range update of feathers is breaking the build 🚨 [\#112](https://github.com/feathersjs/feathers-sequelize/issues/112)
- Using `include` breaks the find method query [\#111](https://github.com/feathersjs/feathers-sequelize/issues/111)
- An in-range update of feathers-errors is breaking the build 🚨 [\#110](https://github.com/feathersjs/feathers-sequelize/issues/110)
- Add `lean` attribute to automatically call toJSON? [\#19](https://github.com/feathersjs/feathers-sequelize/issues/19)
- Add a toJSON bundled hook like mongoose [\#18](https://github.com/feathersjs/feathers-sequelize/issues/18)

**Merged pull requests:**

- Fix issue with custom ID when using eager loading [\#124](https://github.com/feathersjs/feathers-sequelize/pull/124) ([DesignByOnyx](https://github.com/DesignByOnyx))
- Update chai to the latest version 🚀 [\#120](https://github.com/feathersjs/feathers-sequelize/pull/120) ([greenkeeper[bot]](https://github.com/apps/greenkeeper))
- Issue \#113: Model.create ignoring field and virtual setters [\#114](https://github.com/feathersjs/feathers-sequelize/pull/114) ([buske](https://github.com/buske))

## [v2.0.0](https://github.com/feathersjs/feathers-sequelize/tree/v2.0.0) (2017-05-03)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.4.5...v2.0.0)

**Closed issues:**

- update\(\) breaks when sequelize configured with raw:true [\#99](https://github.com/feathersjs/feathers-sequelize/issues/99)
- Discuss querying of NULL values [\#96](https://github.com/feathersjs/feathers-sequelize/issues/96)

**Merged pull requests:**

- Update all methods to return plain JS objects [\#106](https://github.com/feathersjs/feathers-sequelize/pull/106) ([DesignByOnyx](https://github.com/DesignByOnyx))
- Fixed return value of patch method for postgresql dialect [\#104](https://github.com/feathersjs/feathers-sequelize/pull/104) ([msimulcik](https://github.com/msimulcik))
- Update semistandard to the latest version 🚀 [\#103](https://github.com/feathersjs/feathers-sequelize/pull/103) ([greenkeeper[bot]](https://github.com/apps/greenkeeper))
- Update dependencies to enable Greenkeeper 🌴 [\#102](https://github.com/feathersjs/feathers-sequelize/pull/102) ([greenkeeper[bot]](https://github.com/apps/greenkeeper))

## [v1.4.5](https://github.com/feathersjs/feathers-sequelize/tree/v1.4.5) (2017-03-26)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.4.4...v1.4.5)

**Merged pull requests:**

- Fix update no dao [\#101](https://github.com/feathersjs/feathers-sequelize/pull/101) ([lowip](https://github.com/lowip))

## [v1.4.4](https://github.com/feathersjs/feathers-sequelize/tree/v1.4.4) (2017-03-24)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.4.3...v1.4.4)

**Closed issues:**

- Relation between Models not working. [\#98](https://github.com/feathersjs/feathers-sequelize/issues/98)
- Can we create nested models in one go? [\#97](https://github.com/feathersjs/feathers-sequelize/issues/97)
- Add example for model relations [\#20](https://github.com/feathersjs/feathers-sequelize/issues/20)

**Merged pull requests:**

- checking for the toJSON method on the instance before calling it [\#100](https://github.com/feathersjs/feathers-sequelize/pull/100) ([lowip](https://github.com/lowip))

## [v1.4.3](https://github.com/feathersjs/feathers-sequelize/tree/v1.4.3) (2017-03-17)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.4.2...v1.4.3)

**Merged pull requests:**

- use 'returning: true' for postgres to keep patch and its response atomic [\#93](https://github.com/feathersjs/feathers-sequelize/pull/93) ([MichaelErmer](https://github.com/MichaelErmer))

## [v1.4.2](https://github.com/feathersjs/feathers-sequelize/tree/v1.4.2) (2017-03-14)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.4.1...v1.4.2)

**Merged pull requests:**

- Fixed missing where clause [\#92](https://github.com/feathersjs/feathers-sequelize/pull/92) ([eikaramba](https://github.com/eikaramba))

## [v1.4.1](https://github.com/feathersjs/feathers-sequelize/tree/v1.4.1) (2017-03-10)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.4.0...v1.4.1)

**Closed issues:**

- $populate does not seem to work [\#89](https://github.com/feathersjs/feathers-sequelize/issues/89)
- updated\_at column does not get updated at PATCH request [\#88](https://github.com/feathersjs/feathers-sequelize/issues/88)
- Suggested pattern to create a multi model service [\#86](https://github.com/feathersjs/feathers-sequelize/issues/86)
- GroupBy issue [\#84](https://github.com/feathersjs/feathers-sequelize/issues/84)
- Concat and other sequelize functions [\#81](https://github.com/feathersjs/feathers-sequelize/issues/81)
- Solved: How to add relationship [\#80](https://github.com/feathersjs/feathers-sequelize/issues/80)
- Consider creating a sequelize instance during updates: [\#63](https://github.com/feathersjs/feathers-sequelize/issues/63)

**Merged pull requests:**

- Enable eager-loading for GET endpoint [\#91](https://github.com/feathersjs/feathers-sequelize/pull/91) ([eikaramba](https://github.com/eikaramba))
- Update index.js [\#83](https://github.com/feathersjs/feathers-sequelize/pull/83) ([Ryanthegiantlion](https://github.com/Ryanthegiantlion))
- doc: fix README.md comment. [\#82](https://github.com/feathersjs/feathers-sequelize/pull/82) ([omeid](https://github.com/omeid))

## [v1.4.0](https://github.com/feathersjs/feathers-sequelize/tree/v1.4.0) (2016-11-11)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.3.3...v1.4.0)

**Closed issues:**

- TypeError: Cannot read property '2' of null [\#71](https://github.com/feathersjs/feathers-sequelize/issues/71)
- ES6/Babel [\#68](https://github.com/feathersjs/feathers-sequelize/issues/68)

**Merged pull requests:**

- Update feathers-service-tests to version 0.9.0 🚀 [\#79](https://github.com/feathersjs/feathers-sequelize/pull/79) ([greenkeeperio-bot](https://github.com/greenkeeperio-bot))
- sequelize@3.25.0 breaks build 🚨 [\#78](https://github.com/feathersjs/feathers-sequelize/pull/78) ([greenkeeperio-bot](https://github.com/greenkeeperio-bot))
- sequelize@3.24.8 breaks build 🚨 [\#77](https://github.com/feathersjs/feathers-sequelize/pull/77) ([greenkeeperio-bot](https://github.com/greenkeeperio-bot))
- 👻😱 Node.js 0.10 is unmaintained 😱👻 [\#76](https://github.com/feathersjs/feathers-sequelize/pull/76) ([greenkeeperio-bot](https://github.com/greenkeeperio-bot))
- babel-preset-es2015@6.18.0 breaks build 🚨 [\#75](https://github.com/feathersjs/feathers-sequelize/pull/75) ([greenkeeperio-bot](https://github.com/greenkeeperio-bot))
- jshint —\> semistandard [\#72](https://github.com/feathersjs/feathers-sequelize/pull/72) ([corymsmith](https://github.com/corymsmith))

## [v1.3.3](https://github.com/feathersjs/feathers-sequelize/tree/v1.3.3) (2016-09-28)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.3.2...v1.3.3)

**Merged pull requests:**

- Update service tests, id and events option [\#65](https://github.com/feathersjs/feathers-sequelize/pull/65) ([greenkeeperio-bot](https://github.com/greenkeeperio-bot))

## [v1.3.2](https://github.com/feathersjs/feathers-sequelize/tree/v1.3.2) (2016-08-25)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.3.1...v1.3.2)

**Closed issues:**

- Cannot call remove service method when id field name is custom [\#60](https://github.com/feathersjs/feathers-sequelize/issues/60)
- Make params optional [\#59](https://github.com/feathersjs/feathers-sequelize/issues/59)
- Exporting utils.js [\#58](https://github.com/feathersjs/feathers-sequelize/issues/58)

**Merged pull requests:**

- Use correct id property when removing items [\#62](https://github.com/feathersjs/feathers-sequelize/pull/62) ([daffl](https://github.com/daffl))
- Update mocha to version 3.0.0 🚀 [\#57](https://github.com/feathersjs/feathers-sequelize/pull/57) ([greenkeeperio-bot](https://github.com/greenkeeperio-bot))

## [v1.3.1](https://github.com/feathersjs/feathers-sequelize/tree/v1.3.1) (2016-07-20)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.3.0...v1.3.1)

**Merged pull requests:**

- sequelize@3.23.6 breaks build 🚨 [\#54](https://github.com/feathersjs/feathers-sequelize/pull/54) ([greenkeeperio-bot](https://github.com/greenkeeperio-bot))
- Update feathers-query-filters to version 2.0.0 🚀 [\#51](https://github.com/feathersjs/feathers-sequelize/pull/51) ([greenkeeperio-bot](https://github.com/greenkeeperio-bot))

## [v1.3.0](https://github.com/feathersjs/feathers-sequelize/tree/v1.3.0) (2016-07-08)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.2.0...v1.3.0)

**Fixed bugs:**

- We shouldn't remove properties from original objects [\#49](https://github.com/feathersjs/feathers-sequelize/issues/49)

**Merged pull requests:**

- feathers-service-tests@0.6.1 breaks build 🚨 [\#50](https://github.com/feathersjs/feathers-sequelize/pull/50) ([greenkeeperio-bot](https://github.com/greenkeeperio-bot))

## [v1.2.0](https://github.com/feathersjs/feathers-sequelize/tree/v1.2.0) (2016-06-17)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.1.6...v1.2.0)

**Merged pull requests:**

- Update feathers-service-tests to version 0.6.0 🚀 [\#48](https://github.com/feathersjs/feathers-sequelize/pull/48) ([greenkeeperio-bot](https://github.com/greenkeeperio-bot))

## [v1.1.6](https://github.com/feathersjs/feathers-sequelize/tree/v1.1.6) (2016-06-15)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.1.5...v1.1.6)

**Closed issues:**

- TypeError: Cannot read property '$nin' of undefined [\#45](https://github.com/feathersjs/feathers-sequelize/issues/45)

**Merged pull requests:**

- Allow querying for null values [\#47](https://github.com/feathersjs/feathers-sequelize/pull/47) ([daffl](https://github.com/daffl))

## [v1.1.5](https://github.com/feathersjs/feathers-sequelize/tree/v1.1.5) (2016-06-10)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.1.4...v1.1.5)

**Closed issues:**

- Custom id column name [\#40](https://github.com/feathersjs/feathers-sequelize/issues/40)
- Find\(\) generates an invalid query with pagination but no order. [\#39](https://github.com/feathersjs/feathers-sequelize/issues/39)
- Private method \_get\(\) not processing parameters [\#22](https://github.com/feathersjs/feathers-sequelize/issues/22)
- Support $search [\#15](https://github.com/feathersjs/feathers-sequelize/issues/15)

**Merged pull requests:**

- Pass sequelize parameters to findById [\#46](https://github.com/feathersjs/feathers-sequelize/pull/46) ([daffl](https://github.com/daffl))
- mocha@2.5.0 breaks build 🚨 [\#41](https://github.com/feathersjs/feathers-sequelize/pull/41) ([greenkeeperio-bot](https://github.com/greenkeeperio-bot))
- Update babel-plugin-add-module-exports to version 0.2.0 🚀 [\#38](https://github.com/feathersjs/feathers-sequelize/pull/38) ([greenkeeperio-bot](https://github.com/greenkeeperio-bot))
- feathers-rest@1.3.0 breaks build 🚨 [\#34](https://github.com/feathersjs/feathers-sequelize/pull/34) ([greenkeeperio-bot](https://github.com/greenkeeperio-bot))

## [v1.1.4](https://github.com/feathersjs/feathers-sequelize/tree/v1.1.4) (2016-03-10)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.1.3...v1.1.4)

**Closed issues:**

- Create method should support options param [\#25](https://github.com/feathersjs/feathers-sequelize/issues/25)

**Merged pull requests:**

- adding support for sequelize options [\#27](https://github.com/feathersjs/feathers-sequelize/pull/27) ([ekryski](https://github.com/ekryski))

## [v1.1.3](https://github.com/feathersjs/feathers-sequelize/tree/v1.1.3) (2016-03-09)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.1.2...v1.1.3)

**Closed issues:**

- Hook result data shouldn't have sequelize info [\#24](https://github.com/feathersjs/feathers-sequelize/issues/24)
- Service methods should reject with feathers error instance rather throwing in-place [\#23](https://github.com/feathersjs/feathers-sequelize/issues/23)
- When i need force sync? [\#21](https://github.com/feathersjs/feathers-sequelize/issues/21)
- How to retrieve records for a many to many relationship? [\#16](https://github.com/feathersjs/feathers-sequelize/issues/16)

**Merged pull requests:**

- Options param support for create method [\#26](https://github.com/feathersjs/feathers-sequelize/pull/26) ([rafalszemraj](https://github.com/rafalszemraj))

## [v1.1.2](https://github.com/feathersjs/feathers-sequelize/tree/v1.1.2) (2016-02-24)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.1.1...v1.1.2)

**Closed issues:**

- How do you retrieve associations in the response? [\#12](https://github.com/feathersjs/feathers-sequelize/issues/12)

**Merged pull requests:**

- bumping feathers-errors version [\#17](https://github.com/feathersjs/feathers-sequelize/pull/17) ([ekryski](https://github.com/ekryski))

## [v1.1.1](https://github.com/feathersjs/feathers-sequelize/tree/v1.1.1) (2016-02-02)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.1.0...v1.1.1)

**Merged pull requests:**

- Add options to find query [\#14](https://github.com/feathersjs/feathers-sequelize/pull/14) ([lionelrudaz](https://github.com/lionelrudaz))

## [v1.1.0](https://github.com/feathersjs/feathers-sequelize/tree/v1.1.0) (2016-01-30)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.0.10...v1.1.0)

**Closed issues:**

- How to add the model name in the REST response [\#11](https://github.com/feathersjs/feathers-sequelize/issues/11)
- Review patch and remove many for consistency [\#8](https://github.com/feathersjs/feathers-sequelize/issues/8)

**Merged pull requests:**

- Use internal methods instead of service methods directly [\#13](https://github.com/feathersjs/feathers-sequelize/pull/13) ([daffl](https://github.com/daffl))

## [v1.0.10](https://github.com/feathersjs/feathers-sequelize/tree/v1.0.10) (2016-01-24)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.0.9...v1.0.10)

**Merged pull requests:**

- Adding nsp check [\#10](https://github.com/feathersjs/feathers-sequelize/pull/10) ([marshallswain](https://github.com/marshallswain))

## [v1.0.9](https://github.com/feathersjs/feathers-sequelize/tree/v1.0.9) (2016-01-11)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.0.8...v1.0.9)

**Merged pull requests:**

- added value conversion for $sort to utils `getOrder` [\#9](https://github.com/feathersjs/feathers-sequelize/pull/9) ([startupthekid](https://github.com/startupthekid))

## [v1.0.8](https://github.com/feathersjs/feathers-sequelize/tree/v1.0.8) (2016-01-09)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.0.7...v1.0.8)

**Merged pull requests:**

- Use Model.findById\(\) rather than get\(\) [\#7](https://github.com/feathersjs/feathers-sequelize/pull/7) ([evanbarter](https://github.com/evanbarter))

## [v1.0.7](https://github.com/feathersjs/feathers-sequelize/tree/v1.0.7) (2016-01-06)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.0.6...v1.0.7)

**Closed issues:**

- Expose Sequelize lib [\#6](https://github.com/feathersjs/feathers-sequelize/issues/6)

## [v1.0.6](https://github.com/feathersjs/feathers-sequelize/tree/v1.0.6) (2015-12-29)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.0.5...v1.0.6)

## [v1.0.5](https://github.com/feathersjs/feathers-sequelize/tree/v1.0.5) (2015-12-21)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.0.4...v1.0.5)

## [v1.0.4](https://github.com/feathersjs/feathers-sequelize/tree/v1.0.4) (2015-12-21)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.0.3...v1.0.4)

## [v1.0.3](https://github.com/feathersjs/feathers-sequelize/tree/v1.0.3) (2015-12-21)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.0.2...v1.0.3)

## [v1.0.2](https://github.com/feathersjs/feathers-sequelize/tree/v1.0.2) (2015-12-21)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.0.1...v1.0.2)

## [v1.0.1](https://github.com/feathersjs/feathers-sequelize/tree/v1.0.1) (2015-12-19)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v1.0.0...v1.0.1)

## [v1.0.0](https://github.com/feathersjs/feathers-sequelize/tree/v1.0.0) (2015-12-19)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v0.2.1...v1.0.0)

**Merged pull requests:**

- Error mapping [\#5](https://github.com/feathersjs/feathers-sequelize/pull/5) ([ekryski](https://github.com/ekryski))

## [v0.2.1](https://github.com/feathersjs/feathers-sequelize/tree/v0.2.1) (2015-12-18)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v0.2.0...v0.2.1)

**Closed issues:**

- only one instance of babel-polyfill is allowed [\#3](https://github.com/feathersjs/feathers-sequelize/issues/3)

**Merged pull requests:**

- load babel-polyfill only once [\#4](https://github.com/feathersjs/feathers-sequelize/pull/4) ([jgillich](https://github.com/jgillich))

## [v0.2.0](https://github.com/feathersjs/feathers-sequelize/tree/v0.2.0) (2015-12-13)
[Full Changelog](https://github.com/feathersjs/feathers-sequelize/compare/v0.1.0...v0.2.0)

**Closed issues:**

- Take a look at feathers-orm-service which uses sequelize [\#1](https://github.com/feathersjs/feathers-sequelize/issues/1)

**Merged pull requests:**

- Migration to ES6 classes and Promises, support for pagination [\#2](https://github.com/feathersjs/feathers-sequelize/pull/2) ([daffl](https://github.com/daffl))

## [v0.1.0](https://github.com/feathersjs/feathers-sequelize/tree/v0.1.0) (2015-11-23)


\* *This Change Log was automatically generated by [github_changelog_generator](https://github.com/skywinder/Github-Changelog-Generator)*